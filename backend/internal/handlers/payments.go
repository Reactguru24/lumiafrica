package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"lumi-backend/internal/config"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/plans"
	"lumi-backend/internal/paystack"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func paystackClient(cfg *config.Config) *paystack.Client {
	return paystack.NewClient(cfg.PaystackSecretKey)
}

func paymentReference(id string) string {
	return "lumi_" + id
}

func logPayment(event string, fields map[string]interface{}) {
	data, _ := json.Marshal(fields)
	log.Printf("[paystack] %s %s", event, string(data))
}

type paystackInitInput struct {
	ctx             context.Context
	cfg             *config.Config
	q               *sqlc.Queries
	email           string
	amount          float64
	paymentType     sqlc.PaymentTransactionsType
	userID          types.BinaryUUID
	vendorID        *types.BinaryUUID
	metadata        []byte
	idempotencyKey  sql.NullString
	logType         string
	logExtra        map[string]interface{}
	paystackMeta    map[string]interface{}
}

func paymentInitFromMetadata(payment sqlc.PaymentTransaction) (models.PaymentInitializeResponse, bool) {
	var meta map[string]interface{}
	if err := json.Unmarshal(payment.Metadata, &meta); err != nil {
		return models.PaymentInitializeResponse{}, false
	}
	authURL, _ := meta["_authorizationUrl"].(string)
	accessCode, _ := meta["_accessCode"].(string)
	if authURL == "" {
		return models.PaymentInitializeResponse{}, false
	}
	return models.PaymentInitializeResponse{
		AuthorizationURL: authURL,
		AccessCode:       accessCode,
		Reference:        payment.Reference,
	}, true
}

func withPaymentInitMeta(metaJSON []byte, authURL, accessCode string) ([]byte, error) {
	var meta map[string]interface{}
	if err := json.Unmarshal(metaJSON, &meta); err != nil {
		return nil, err
	}
	meta["_authorizationUrl"] = authURL
	meta["_accessCode"] = accessCode
	return json.Marshal(meta)
}

func initializePaystackPayment(in paystackInitInput) (models.PaymentInitializeResponse, error) {
	paymentID := utils.GenerateBinaryID()
	reference := paymentReference(paymentID.String())
	metaJSON := in.metadata
	if err := in.q.CreatePaymentTransaction(in.ctx, sqlc.CreatePaymentTransactionParams{
		ID:                 paymentID,
		Reference:          reference,
		Type:               in.paymentType,
		UserID:             in.userID,
		VendorID:           in.vendorID,
		Amount:             store.FloatToDecimalString(in.amount),
		Currency:           "KES",
		PaystackAccessCode: sql.NullString{},
		Metadata:           metaJSON,
	}); err != nil {
		return models.PaymentInitializeResponse{}, err
	}

	initData, err := paystackClient(in.cfg).Initialize(paystack.InitializeRequest{
		Email:       in.email,
		Amount:      paystack.AmountToKobo(in.amount),
		Reference:   reference,
		Currency:    "KES",
		CallbackURL: in.cfg.PaystackCallbackURL,
		Channels:    []string{"card", "mobile_money"},
		Metadata:    withPaymentIDMeta(in.paystackMeta, paymentID.String()),
	})
	if err != nil {
		return models.PaymentInitializeResponse{}, err
	}

	enrichedMeta, err := withPaymentInitMeta(metaJSON, initData.AuthorizationURL, initData.AccessCode)
	if err == nil {
		_ = in.q.UpdatePaymentInitMetadata(in.ctx, sqlc.UpdatePaymentInitMetadataParams{
			Metadata:           enrichedMeta,
			PaystackAccessCode: sql.NullString{String: initData.AccessCode, Valid: true},
			ID:                 paymentID,
		})
	}

	logFields := map[string]interface{}{
		"type":      in.logType,
		"reference": reference,
		"paymentId": paymentID,
		"amount":    in.amount,
		"callback":  in.cfg.PaystackCallbackURL,
	}
	for k, v := range in.logExtra {
		logFields[k] = v
	}
	logPayment("payment_initialized", logFields)

	return models.PaymentInitializeResponse{
		AuthorizationURL: initData.AuthorizationURL,
		AccessCode:       initData.AccessCode,
		Reference:        reference,
	}, nil
}

func withPaymentIDMeta(meta map[string]interface{}, paymentID string) map[string]interface{} {
	out := make(map[string]interface{}, len(meta)+1)
	for k, v := range meta {
		out[k] = v
	}
	out["payment_id"] = paymentID
	return out
}

func existingPaymentOutcome(payment sqlc.PaymentTransaction) (models.PaymentVerifyResponse, bool) {
	switch payment.Status {
	case sqlc.PaymentTransactionsStatusSuccess:
		return buildPaymentVerifyResponse(payment), true
	case sqlc.PaymentTransactionsStatusRefunded:
		return buildRefundedPaymentResponse(payment), true
	default:
		return models.PaymentVerifyResponse{}, false
	}
}

// InitializeOrderPayment godoc
// @Summary Initialize order payment via Paystack
// @Description Customer checkout — creates a Paystack payment session for cart items
// @Tags Payment
// @Accept json
// @Produce json
// @Security Bearer
// @Param order body models.CreateOrderRequest true "Order details"
// @Success 200 {object} models.PaymentInitializeResponse
// @Router /payments/orders/initialize [post]
func InitializeOrderPayment(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := middleware.GetUserID(c)
		userID, err := utils.ParseID(userIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		var req models.CreateOrderRequest
		if !bindJSON(c, &req) {
			return
		}
		if len(req.Items) == 0 {
			utils.Error(c, http.StatusBadRequest, "Order must contain at least one item")
			return
		}

		ctx := c.Request.Context()
		st := getStore(c)
		q := st.Queries()
		subtotal, err := validateOrderItems(ctx, q, req.Items)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}

		user, err := q.GetUserByID(ctx, userID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch user")
			return
		}

		meta, err := prepareOrderPaymentMetadata(ctx, q, userID, req, subtotal)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		metaJSON, err := json.Marshal(meta)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to prepare payment")
			return
		}

		idempotencyKey := sql.NullString{}
		if key := strings.TrimSpace(c.GetHeader("Idempotency-Key")); key != "" {
			idempotencyKey = sql.NullString{String: key, Valid: true}
		}

		resp, err := initializePaystackPayment(paystackInitInput{
			ctx:            ctx,
			cfg:            cfg,
			q:              q,
			email:          user.Email,
			amount:         meta.Total,
			paymentType:    sqlc.PaymentTransactionsTypeOrder,
			userID:         userID,
			metadata:       metaJSON,
			idempotencyKey: idempotencyKey,
			logType:        "order",
			logExtra:    map[string]interface{}{"userId": userIDStr},
			paystackMeta: map[string]interface{}{
				"type":    string(models.PaymentTypeOrder),
				"user_id": userIDStr,
			},
		})
		if err != nil {
			utils.Error(c, http.StatusBadGateway, "Failed to initialize payment: "+err.Error())
			return
		}
		utils.Success(c, resp)
	}
}

// InitializeSubscriptionPayment godoc
// @Summary Initialize subscription payment via Paystack
// @Description Vendor checkout — creates a Paystack payment session for a featured listing plan
// @Tags Subscription
// @Accept json
// @Produce json
// @Security Bearer
// @Param subscription body models.SubscribeRequest true "Subscription details"
// @Success 200 {object} models.PaymentInitializeResponse
// @Router /vendor/subscriptions/initialize [post]
func InitializeSubscriptionPayment(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		var req models.SubscribeRequest
		if !bindJSON(c, &req) {
			return
		}

		plan, err := plans.Get(cfg, req.Plan)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid subscription plan")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := validateSubscriptionProducts(ctx, q, vendorIDStr, req.ProductIDs, plan.FeaturedSlots); err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}

		vendor, err := q.GetVendorByID(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch vendor")
			return
		}
		user, err := q.GetUserByID(ctx, vendor.UserID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch user")
			return
		}

		paymentMethod := req.PaymentMethod
		if paymentMethod == "" {
			paymentMethod = "Paystack"
		}
		metadata := models.SubscriptionPaymentMetadata{
			Plan:          req.Plan,
			PaymentMethod: paymentMethod,
			ProductIDs:    req.ProductIDs,
		}
		metaJSON, err := json.Marshal(metadata)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to prepare payment")
			return
		}

		resp, err := initializePaystackPayment(paystackInitInput{
			ctx:         ctx,
			cfg:         cfg,
			q:           q,
			email:       user.Email,
			amount:      plan.PriceKES,
			paymentType: sqlc.PaymentTransactionsTypeSubscription,
			userID:      vendor.UserID,
			vendorID:    &vendorID,
			metadata:    metaJSON,
			logType:     "subscription",
			logExtra:    map[string]interface{}{"vendorId": vendorIDStr},
			paystackMeta: map[string]interface{}{
				"type":      string(models.PaymentTypeSubscription),
				"vendor_id": vendorIDStr,
			},
		})
		if err != nil {
			utils.Error(c, http.StatusBadGateway, "Failed to initialize payment: "+err.Error())
			return
		}
		utils.Success(c, resp)
	}
}

// VerifyPayment godoc
// @Summary Verify Paystack payment after redirect
// @Description Confirms payment status after Paystack redirect (orders and subscriptions)
// @Tags Payment
// @Produce json
// @Param reference query string true "Payment reference"
// @Success 200 {object} models.PaymentVerifyResponse
// @Router /payments/verify [get]
func VerifyPayment(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		reference := c.Query("reference")
		trxref := c.Query("trxref")
		if reference == "" {
			reference = trxref
		}

		logPayment("callback_received", map[string]interface{}{
			"path":      c.Request.URL.Path,
			"reference": reference,
			"trxref":    trxref,
			"remote":    c.ClientIP(),
		})

		if reference == "" {
			logPayment("callback_failed", map[string]interface{}{"reason": "missing reference"})
			utils.Error(c, http.StatusBadRequest, "reference is required")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		payment, err := q.GetPaymentByReference(ctx, reference)
		if handleNotFound(c, err, "Payment not found", "Failed to fetch payment") {
			logPayment("callback_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "payment not found",
			})
			return
		}

		if outcome, done := existingPaymentOutcome(payment); done {
			if payment.Status == sqlc.PaymentTransactionsStatusSuccess {
				logPayment("callback_already_fulfilled", map[string]interface{}{
					"reference": reference,
					"type":      payment.Type,
					"orderId":   idPtrString(payment.OrderID),
					"subId":     idPtrString(payment.SubscriptionID),
				})
			} else {
				logPayment("callback_already_refunded", map[string]interface{}{
					"reference": reference,
					"type":      payment.Type,
				})
			}
			utils.Success(c, outcome)
			return
		}

		logPayment("callback_verifying", map[string]interface{}{
			"reference": reference,
			"type":      payment.Type,
			"status":    payment.Status,
		})

		verified, err := paystackClient(cfg).Verify(reference)
		if err != nil {
			logPayment("callback_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "paystack verify error",
				"error":     err.Error(),
			})
			utils.Error(c, http.StatusBadGateway, "Payment verification failed")
			return
		}
		if verified.Status != "success" {
			logPayment("callback_pending", map[string]interface{}{
				"reference":       reference,
				"paystackStatus": verified.Status,
			})
			utils.Success(c, models.PaymentVerifyResponse{
				Status:    models.PaymentStatusPending,
				Type:      models.PaymentType(payment.Type),
				Reference: reference,
			})
			return
		}

		result, err := processSuccessfulCharge(ctx, getStore(c), cfg, payment, reference, "callback")
		if err != nil {
			logPayment("callback_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "fulfillment or refund error",
				"error":     err.Error(),
			})
			utils.Error(c, http.StatusInternalServerError, err.Error())
			return
		}
		logPayment("callback_fulfilled", map[string]interface{}{
			"reference":      reference,
			"type":           result.Type,
			"orderId":        result.OrderID,
			"subscriptionId": result.SubscriptionID,
		})
		utils.Success(c, result)
	}
}

// PaystackWebhook godoc
// @Summary Paystack webhook callback
// @Description Server-to-server Paystack event handler (configure in Paystack dashboard)
// @Tags Payment
// @Accept json
// @Produce json
// @Router /webhooks/paystack [post]
func PaystackWebhook(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			logPayment("webhook_failed", map[string]interface{}{
				"path":   c.Request.URL.Path,
				"remote": c.ClientIP(),
				"reason": "invalid payload",
			})
			utils.Error(c, http.StatusBadRequest, "Invalid payload")
			return
		}

		signature := c.GetHeader("x-paystack-signature")
		logPayment("webhook_received", map[string]interface{}{
			"path":              c.Request.URL.Path,
			"remote":            c.ClientIP(),
			"hasSignature":      signature != "",
			"payloadBytes":      len(body),
		})

		if !paystack.VerifySignature(body, signature, cfg.PaystackSecretKey) {
			logPayment("webhook_failed", map[string]interface{}{
				"path":   c.Request.URL.Path,
				"remote": c.ClientIP(),
				"reason": "invalid signature",
			})
			utils.Error(c, http.StatusUnauthorized, "Invalid signature")
			return
		}

		var event paystack.WebhookEvent
		if err := json.Unmarshal(body, &event); err != nil {
			logPayment("webhook_failed", map[string]interface{}{
				"path":   c.Request.URL.Path,
				"reason": "invalid json",
				"error":  err.Error(),
			})
			utils.Error(c, http.StatusBadRequest, "Invalid event payload")
			return
		}

		logPayment("webhook_event", map[string]interface{}{
			"event":     event.Event,
			"reference": event.Data.Reference,
			"status":    event.Data.Status,
			"amount":    event.Data.Amount,
			"currency":  event.Data.Currency,
		})

		if event.Event != "charge.success" {
			utils.Success(c, gin.H{"received": true})
			return
		}

		reference := event.Data.Reference
		ctx := c.Request.Context()
		st := getStore(c)
		payment, err := st.Queries().GetPaymentByReference(ctx, reference)
		if errors.Is(err, sql.ErrNoRows) {
			logPayment("webhook_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "payment not found",
			})
			utils.Error(c, http.StatusNotFound, "Payment not found")
			return
		}
		if err != nil {
			logPayment("webhook_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "db error",
				"error":     err.Error(),
			})
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch payment")
			return
		}
		if outcome, done := existingPaymentOutcome(payment); done {
			if payment.Status == sqlc.PaymentTransactionsStatusSuccess {
				logPayment("webhook_already_fulfilled", map[string]interface{}{
					"reference": reference,
					"type":      payment.Type,
				})
			} else {
				logPayment("webhook_already_refunded", map[string]interface{}{
					"reference": reference,
					"type":      payment.Type,
				})
			}
			_ = outcome
			utils.Success(c, gin.H{"received": true})
			return
		}

		if _, err := processSuccessfulCharge(ctx, st, cfg, payment, reference, "webhook"); err != nil {
			logPayment("webhook_failed", map[string]interface{}{
				"reference": reference,
				"reason":    "fulfillment or refund error",
				"error":     err.Error(),
			})
			utils.Error(c, http.StatusInternalServerError, err.Error())
			return
		}
		logPayment("webhook_fulfilled", map[string]interface{}{
			"reference": reference,
			"type":      payment.Type,
		})
		utils.Success(c, gin.H{"received": true})
	}
}

func processSuccessfulCharge(ctx context.Context, st *store.Store, cfg *config.Config, payment sqlc.PaymentTransaction, reference string, source string) (models.PaymentVerifyResponse, error) {
	result, err := fulfillPayment(ctx, st, cfg, payment, reference, source)
	if err == nil {
		return result, nil
	}
	return refundAfterFulfillmentFailure(ctx, st, cfg, payment, reference, source, err)
}

func refundAfterFulfillmentFailure(ctx context.Context, st *store.Store, cfg *config.Config, payment sqlc.PaymentTransaction, reference, source string, fulfillErr error) (models.PaymentVerifyResponse, error) {
	reason := fulfillErr.Error()
	logPayment("fulfillment_failed", map[string]interface{}{
		"source":    source,
		"reference": reference,
		"type":      payment.Type,
		"error":     reason,
	})

	q := st.Queries()
	fresh, err := q.GetPaymentByReference(ctx, reference)
	if err == nil {
		if fresh.Status == sqlc.PaymentTransactionsStatusRefunded {
			return buildRefundedPaymentResponse(fresh), nil
		}
		if fresh.Status == sqlc.PaymentTransactionsStatusSuccess {
			return models.PaymentVerifyResponse{}, fmt.Errorf("payment already fulfilled")
		}
		payment = fresh
	}

	if _, err := paystackClient(cfg).Refund(reference, reason); err != nil {
		logPayment("refund_failed", map[string]interface{}{
			"source":    source,
			"reference": reference,
			"error":     err.Error(),
		})
		return models.PaymentVerifyResponse{}, fmt.Errorf("%s. We could not issue an automatic refund — please contact support with reference %s", customerFacingRefundMessage(fulfillErr), reference)
	}

	if err := q.UpdatePaymentStatus(ctx, sqlc.UpdatePaymentStatusParams{
		Status:         sqlc.PaymentTransactionsStatusRefunded,
		OrderID:        nil,
		SubscriptionID: nil,
		ID:             payment.ID,
	}); err != nil {
		logPayment("refund_status_update_failed", map[string]interface{}{
			"source":    source,
			"reference": reference,
			"error":     err.Error(),
		})
		return models.PaymentVerifyResponse{}, fmt.Errorf("refund issued but we could not update your payment record — contact support with reference %s", reference)
	}

	message := customerFacingRefundMessage(fulfillErr)
	logPayment("payment_refunded", map[string]interface{}{
		"source":    source,
		"reference": reference,
		"type":      payment.Type,
		"reason":    reason,
	})
	return models.PaymentVerifyResponse{
		Status:    models.PaymentStatusRefunded,
		Type:      models.PaymentType(payment.Type),
		Reference: reference,
		Message:   message,
	}, nil
}

func customerFacingRefundMessage(err error) string {
	lower := strings.ToLower(err.Error())
	if strings.Contains(lower, "stock") {
		return "One or more items were no longer available. Your payment has been fully refunded."
	}
	return "We could not complete your order. Your payment has been fully refunded."
}

func buildRefundedPaymentResponse(payment sqlc.PaymentTransaction) models.PaymentVerifyResponse {
	return models.PaymentVerifyResponse{
		Status:    models.PaymentStatusRefunded,
		Type:      models.PaymentType(payment.Type),
		Reference: payment.Reference,
		Message:   "Your payment has been fully refunded.",
	}
}

func fulfillPayment(ctx context.Context, st *store.Store, cfg *config.Config, payment sqlc.PaymentTransaction, reference string, source string) (models.PaymentVerifyResponse, error) {
	q := st.Queries()
	switch payment.Type {
	case sqlc.PaymentTransactionsTypeOrder:
		orderID, err := createOrderFromPayment(ctx, st, payment)
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		orderUUID, err := utils.ParseID(orderID)
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		rows, err := q.UpdatePaymentStatusIfPending(ctx, sqlc.UpdatePaymentStatusIfPendingParams{
			Status:         sqlc.PaymentTransactionsStatusSuccess,
			OrderID:        &orderUUID,
			SubscriptionID: nil,
			ID:             payment.ID,
		})
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		if rows == 0 {
			fresh, ferr := q.GetPaymentByReference(ctx, reference)
			if ferr == nil {
				if outcome, done := existingPaymentOutcome(fresh); done {
					return outcome, nil
				}
			}
			return models.PaymentVerifyResponse{}, fmt.Errorf("payment already processed")
		}
		logPayment("payment_fulfilled", map[string]interface{}{
			"source":    source,
			"reference": reference,
			"type":      "order",
			"orderId":   orderID,
		})
		return models.PaymentVerifyResponse{
			Status:    models.PaymentStatusSuccess,
			Type:      models.PaymentTypeOrder,
			Reference: reference,
			OrderID:   orderID,
		}, nil
	case sqlc.PaymentTransactionsTypeSubscription:
		subID, err := activateSubscriptionFromPayment(ctx, q, payment, cfg)
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		subUUID, err := utils.ParseID(subID)
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		rows, err := q.UpdatePaymentStatusIfPending(ctx, sqlc.UpdatePaymentStatusIfPendingParams{
			Status:         sqlc.PaymentTransactionsStatusSuccess,
			OrderID:        nil,
			SubscriptionID: &subUUID,
			ID:             payment.ID,
		})
		if err != nil {
			return models.PaymentVerifyResponse{}, err
		}
		if rows == 0 {
			fresh, ferr := q.GetPaymentByReference(ctx, reference)
			if ferr == nil {
				if outcome, done := existingPaymentOutcome(fresh); done {
					return outcome, nil
				}
			}
			return models.PaymentVerifyResponse{}, fmt.Errorf("payment already processed")
		}
		logPayment("payment_fulfilled", map[string]interface{}{
			"source":         source,
			"reference":      reference,
			"type":           "subscription",
			"subscriptionId": subID,
		})
		return models.PaymentVerifyResponse{
			Status:         models.PaymentStatusSuccess,
			Type:           models.PaymentTypeSubscription,
			Reference:      reference,
			SubscriptionID: subID,
		}, nil
	default:
		return models.PaymentVerifyResponse{}, fmt.Errorf("unsupported payment type")
	}
}

func createOrderFromPayment(ctx context.Context, st *store.Store, payment sqlc.PaymentTransaction) (string, error) {
	if payment.OrderID != nil && !payment.OrderID.IsZero() {
		return payment.OrderID.String(), nil
	}
	q := st.Queries()
	var meta models.OrderPaymentMetadata
	if err := json.Unmarshal(payment.Metadata, &meta); err != nil {
		return "", fmt.Errorf("invalid payment metadata")
	}
	if _, err := validateOrderItems(ctx, q, meta.Items); err != nil {
		return "", err
	}

	tx, err := st.DB().SQL.BeginTx(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("failed to start transaction")
	}
	qtx := q.WithTx(tx)

	orderID := utils.GenerateBinaryID()
	if err := qtx.CreateOrder(ctx, sqlc.CreateOrderParams{
		ID:              orderID,
		UserID:          payment.UserID,
		DeliveryZoneID:  optionalBinaryUUID(meta.DeliveryZoneID),
		CouponID:        optionalBinaryUUID(meta.CouponID),
		Subtotal:        store.FloatToDecimalString(meta.Subtotal),
		DiscountAmount:  store.FloatToDecimalString(meta.DiscountAmount),
		ShippingCost:    store.FloatToDecimalString(meta.ShippingCost),
		TaxAmount:       store.FloatToDecimalString(meta.TaxAmount),
		Total:           store.FloatToDecimalString(meta.Total),
		PaymentMethod:   meta.PaymentMethod,
		DeliveryAddress: json.RawMessage(`"` + meta.DeliveryAddress + `"`),
		Notes:           sql.NullString{String: derefString(meta.Notes), Valid: meta.Notes != nil},
	}); err != nil {
		tx.Rollback()
		return "", err
	}
	if meta.CouponID != nil && meta.DiscountAmount > 0 {
		couponID := optionalBinaryUUID(meta.CouponID)
		if couponID != nil {
			if err := qtx.CreateCouponUse(ctx, sqlc.CreateCouponUseParams{
				ID:             utils.GenerateBinaryID(),
				CouponID:       *couponID,
				UserID:         payment.UserID,
				OrderID:        orderID,
				DiscountAmount: store.FloatToDecimalString(meta.DiscountAmount),
			}); err != nil {
				tx.Rollback()
				return "", err
			}
			if err := qtx.IncrementCouponUses(ctx, *couponID); err != nil {
				tx.Rollback()
				return "", err
			}
		}
	}
	if err := decrementOrderStock(ctx, qtx, meta.Items); err != nil {
		tx.Rollback()
		return "", err
	}
	if err := recordOrderSettlements(ctx, qtx, orderID.String(), meta.Items); err != nil {
		tx.Rollback()
		return "", err
	}
	now := utils.Now()
	if err := qtx.SetOrderTimestamps(ctx, sqlc.SetOrderTimestampsParams{
		CreatedAt: now,
		UpdatedAt: now,
		ID:        orderID,
	}); err != nil {
		tx.Rollback()
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("failed to complete order")
	}
	return orderID.String(), nil
}

func activateSubscriptionFromPayment(ctx context.Context, q *sqlc.Queries, payment sqlc.PaymentTransaction, cfg *config.Config) (string, error) {
	if payment.VendorID == nil || payment.VendorID.IsZero() {
		return "", fmt.Errorf("vendor is required for subscription payment")
	}
	vendorID := *payment.VendorID

	var meta models.SubscriptionPaymentMetadata
	if err := json.Unmarshal(payment.Metadata, &meta); err != nil {
		return "", fmt.Errorf("invalid payment metadata")
	}
	plan, err := plans.Get(cfg, meta.Plan)
	if err != nil {
		return "", fmt.Errorf("invalid subscription plan")
	}
	if err := validateSubscriptionProducts(ctx, q, vendorID.String(), meta.ProductIDs, plan.FeaturedSlots); err != nil {
		return "", err
	}

	_ = q.DeactivateVendorSubscriptions(ctx, vendorID)
	now := time.Now()
	subID := utils.GenerateBinaryID()
	if err := q.CreateSubscription(ctx, sqlc.CreateSubscriptionParams{
		ID:            subID,
		VendorID:      vendorID,
		Plan:          sqlc.VendorSubscriptionsPlan(meta.Plan),
		AmountPaid:    store.FloatToDecimalString(plan.PriceKES),
		PaymentMethod: meta.PaymentMethod,
		StartedAt:     now,
		ExpiresAt:     now.AddDate(0, plan.DurationMonths, 0),
	}); err != nil {
		return "", err
	}

	if err := q.FeatureVendor(ctx, sqlc.FeatureVendorParams{
		IsFeatured: 1,
		ID:         vendorID,
	}); err != nil {
		return "", err
	}

	_ = q.ClearVendorFeaturedProducts(ctx, vendorID)
	for _, productIDStr := range meta.ProductIDs {
		productID, err := utils.ParseID(productIDStr)
		if err != nil {
			return "", err
		}
		if err := q.SetProductFeaturedByVendor(ctx, sqlc.SetProductFeaturedByVendorParams{
			Featured: 1,
			ID:       productID,
			VendorID: vendorID,
		}); err != nil {
			return "", err
		}
	}

	return subID.String(), nil
}

func buildPaymentVerifyResponse(payment sqlc.PaymentTransaction) models.PaymentVerifyResponse {
	resp := models.PaymentVerifyResponse{
		Status:    models.PaymentStatusSuccess,
		Type:      models.PaymentType(payment.Type),
		Reference: payment.Reference,
	}
	if payment.OrderID != nil && !payment.OrderID.IsZero() {
		resp.OrderID = payment.OrderID.String()
	}
	if payment.SubscriptionID != nil && !payment.SubscriptionID.IsZero() {
		resp.SubscriptionID = payment.SubscriptionID.String()
	}
	return resp
}

func validateSubscriptionProducts(ctx context.Context, q *sqlc.Queries, vendorIDStr string, productIDs []string, maxSlots int) error {
	vendorID, err := utils.ParseID(vendorIDStr)
	if err != nil {
		return errors.New("invalid vendor id")
	}
	if len(productIDs) > maxSlots {
		return fmt.Errorf("you can select up to %d featured products for this plan", maxSlots)
	}
	seen := make(map[string]struct{}, len(productIDs))
	for _, productIDStr := range productIDs {
		if productIDStr == "" {
			return errors.New("invalid product id")
		}
		if _, ok := seen[productIDStr]; ok {
			return errors.New("duplicate product selection")
		}
		seen[productIDStr] = struct{}{}
		productID, err := utils.ParseID(productIDStr)
		if err != nil {
			return errors.New("invalid product id")
		}
		product, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("product not found: %s", productIDStr)
		}
		if err != nil {
			return errors.New("failed to validate product")
		}
		if product.Status != sqlc.ProductsStatusActive && product.Status != sqlc.ProductsStatusPending {
			return fmt.Errorf("product cannot be featured: %s", productIDStr)
		}
	}
	return nil
}

func vendorFeaturedSlotLimit(ctx context.Context, q *sqlc.Queries, vendorIDStr string, cfg *config.Config) (int, error) {
	vendorID, err := utils.ParseID(vendorIDStr)
	if err != nil {
		return 0, err
	}
	sub, err := q.GetActiveSubscription(ctx, vendorID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	if sub.ExpiresAt.Before(time.Now()) {
		return 0, nil
	}
	if cfg == nil {
		return 0, nil
	}
	plan, err := plans.Get(cfg, string(sub.Plan))
	if err != nil {
		return 0, nil
	}
	return plan.FeaturedSlots, nil
}
