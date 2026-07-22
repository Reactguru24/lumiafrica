package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/idempotency"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/paystack"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

const minWithdrawalKES = 100.0

func normalizeKenyaPhone(phone string) (string, error) {
	return paystack.NormalizeKenyaPhone(phone)
}

func maskPhone(phone string) string {
	if len(phone) < 4 {
		return phone
	}
	return phone[:len(phone)-4] + "****"
}

func toPayoutMethodResponse(row sqlc.VendorPayoutMethod) models.VendorPayoutMethodResponse {
	resp := models.VendorPayoutMethodResponse{
		ID:          row.ID.String(),
		Type:        string(row.Type),
		AccountName: row.AccountName,
		IsDefault:   row.IsDefault != 0,
	}
	if row.Type == sqlc.VendorPayoutMethodsTypeMpesa {
		resp.Phone = maskPhone(row.AccountRef)
	} else if row.Type == sqlc.VendorPayoutMethodsTypeBankTransfer {
		if row.BankName.Valid {
			resp.BankName = row.BankName.String
		}
		if row.BankAccountNumber.Valid {
			resp.BankAccountNumber = row.BankAccountNumber.String
		}
		if row.BankRoutingNumber.Valid {
			resp.BankRoutingNumber = row.BankRoutingNumber.String
		}
		if row.BankCurrency.Valid {
			resp.BankCurrency = row.BankCurrency.String
		}
	}
	return resp
}

func toPayoutResponse(row sqlc.VendorPayout) models.VendorPayoutResponse {
	resp := models.VendorPayoutResponse{
		ID:          row.ID.String(),
		Amount:      store.ToFloat(row.Amount),
		Currency:    row.Currency,
		Status:      string(row.Status),
		PeriodStart: row.PeriodStart.Format("2006-01-02"),
		PeriodEnd:   row.PeriodEnd.Format("2006-01-02"),
		CreatedAt:   row.CreatedAt.Format(time.RFC3339),
	}
	if row.Reference.Valid {
		resp.Reference = row.Reference.String
	}
	if row.CompletedAt.Valid {
		resp.CompletedAt = row.CompletedAt.Time.Format(time.RFC3339)
	}
	return resp
}

func vendorAvailableBalance(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID) (float64, error) {
	raw, err := q.GetVendorAvailableSettlementBalance(ctx, vendorID)
	if err == nil {
		balance := store.ParseDecimalString(raw)
		if balance > 0 {
			return balance, nil
		}
	}
	legacy, err := q.GetVendorAvailableBalance(ctx, vendorID)
	if err != nil {
		return 0, err
	}
	switch v := legacy.(type) {
	case float64:
		return v, nil
	case []byte:
		return store.ParseDecimalString(string(v)), nil
	case string:
		return store.ParseDecimalString(v), nil
	default:
		return store.ToFloat(fmt.Sprint(v)), nil
	}
}

// GetVendorPayoutBalance godoc
// @Summary Vendor withdrawable balance
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} models.VendorPayoutBalanceResponse
// @Router /vendor/payouts/balance [get]
func GetVendorPayoutBalance() gin.HandlerFunc {
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
		balance, err := vendorAvailableBalance(c.Request.Context(), getStore(c).Queries(), vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch balance")
			return
		}
		utils.Success(c, models.VendorPayoutBalanceResponse{
			AvailableBalance: balance,
			Currency:         "KES",
			MinimumWithdraw:  minWithdrawalKES,
		})
	}
}

// ListVendorPayoutMethods godoc
// @Summary List vendor payout methods
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {array} models.VendorPayoutMethodResponse
// @Router /vendor/payouts/methods [get]
func ListVendorPayoutMethods() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, _ := utils.ParseID(vendorIDStr)
		rows, err := getStore(c).Queries().ListVendorPayoutMethods(c.Request.Context(), vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to list payout methods")
			return
		}
		out := make([]models.VendorPayoutMethodResponse, 0, len(rows))
		for _, row := range rows {
			out = append(out, toPayoutMethodResponse(row))
		}
		utils.Success(c, out)
	}
}

// CreateVendorMpesaMethod godoc
// @Summary Add M-Pesa payout method
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param body body models.CreateMpesaPayoutMethodRequest true "M-Pesa details"
// @Success 201 {object} models.VendorPayoutMethodResponse
// @Router /vendor/payouts/methods [post]
func CreateVendorMpesaMethod() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		var req models.CreateMpesaPayoutMethodRequest
		if !bindJSON(c, &req) {
			return
		}
		phone, err := normalizeKenyaPhone(req.Phone)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		req.AccountName = strings.TrimSpace(req.AccountName)
		if req.AccountName == "" {
			utils.Error(c, http.StatusBadRequest, "Account name is required")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendorID, _ := utils.ParseID(vendorIDStr)
		if req.IsDefault {
			_ = q.ClearVendorDefaultPayoutMethods(ctx, vendorID)
		}
		methodID := utils.GenerateBinaryID()
		isDefault := int16(0)
		if req.IsDefault {
			isDefault = 1
		} else {
			methods, _ := q.ListVendorPayoutMethods(ctx, vendorID)
			if len(methods) == 0 {
				isDefault = 1
			}
		}
		if err := q.CreateVendorPayoutMethod(ctx, sqlc.CreateVendorPayoutMethodParams{
			ID:          methodID,
			VendorID:    vendorID,
			AccountName: req.AccountName,
			AccountRef:  phone,
			IsDefault:   isDefault,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to save payout method")
			return
		}
		// New phone — drop any cached Paystack recipient codes from prior methods.
		_ = q.ClearVendorMpesaRecipientCodes(ctx, vendorID)
		row, err := q.GetVendorPayoutMethodByID(ctx, sqlc.GetVendorPayoutMethodByIDParams{
			ID: methodID, VendorID: vendorID,
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load payout method")
			return
		}
		utils.SuccessCreated(c, toPayoutMethodResponse(row))
	}
}

// CreateVendorBankTransferMethod godoc
// @Summary Add Bank Transfer payout method
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param body body models.CreateBankTransferPayoutMethodRequest true "Bank account details"
// @Success 201 {object} models.VendorPayoutMethodResponse
// @Router /vendor/payouts/methods/bank [post]
func CreateVendorBankTransferMethod() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		var req models.CreateBankTransferPayoutMethodRequest
		if !bindJSON(c, &req) {
			return
		}
		req.AccountName = strings.TrimSpace(req.AccountName)
		if req.AccountName == "" {
			utils.Error(c, http.StatusBadRequest, "Account holder name is required")
			return
		}
		if req.BankAccountNumber == "" {
			utils.Error(c, http.StatusBadRequest, "Bank account number is required")
			return
		}
		if req.BankRoutingNumber == "" {
			utils.Error(c, http.StatusBadRequest, "Bank routing number (SWIFT/IFSC) is required")
			return
		}
		if req.BankName == "" {
			utils.Error(c, http.StatusBadRequest, "Bank name is required")
			return
		}
		if req.BankCurrency == "" {
			req.BankCurrency = "KES"
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendorID, _ := utils.ParseID(vendorIDStr)

		if req.IsDefault {
			_ = q.ClearVendorDefaultPayoutMethods(ctx, vendorID)
		}
		methodID := utils.GenerateBinaryID()
		isDefault := int16(0)
		if req.IsDefault {
			isDefault = 1
		} else {
			methods, _ := q.ListVendorPayoutMethods(ctx, vendorID)
			if len(methods) == 0 {
				isDefault = 1
			}
		}
		if err := q.CreateVendorBankTransferMethod(ctx, sqlc.CreateVendorBankTransferMethodParams{
			ID:                methodID,
			VendorID:          vendorID,
			AccountName:       req.AccountName,
			AccountRef:        "",
			BankAccountNumber: req.BankAccountNumber,
			BankRoutingNumber: req.BankRoutingNumber,
			BankCurrency:      req.BankCurrency,
			IsDefault:         isDefault,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to save bank account")
			return
		}
		row, err := q.GetVendorPayoutMethodByID(ctx, sqlc.GetVendorPayoutMethodByIDParams{
			ID: methodID, VendorID: vendorID,
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load payout method")
			return
		}
		utils.SuccessCreated(c, toPayoutMethodResponse(row))
	}
}

// UpdateVendorBankTransferMethod godoc
// @Summary Update Bank Transfer payout method
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param methodId path string true "Payout method ID"
// @Param body body models.UpdateBankTransferPayoutMethodRequest true "Bank account details"
// @Success 200 {object} models.VendorPayoutMethodResponse
// @Router /vendor/payouts/methods/bank/{methodId} [put]
func UpdateVendorBankTransferMethod() gin.HandlerFunc {
	return func(c *gin.Context) {
		methodID, ok := parsePathID(c, "methodId")
		if !ok {
			return
		}
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		var req models.UpdateBankTransferPayoutMethodRequest
		if !bindJSON(c, &req) {
			return
		}
		req.AccountName = strings.TrimSpace(req.AccountName)
		if req.AccountName == "" {
			utils.Error(c, http.StatusBadRequest, "Account holder name is required")
			return
		}
		if req.BankAccountNumber == "" {
			utils.Error(c, http.StatusBadRequest, "Bank account number is required")
			return
		}
		if req.BankRoutingNumber == "" {
			utils.Error(c, http.StatusBadRequest, "Bank routing number (SWIFT/IFSC) is required")
			return
		}
		if req.BankName == "" {
			utils.Error(c, http.StatusBadRequest, "Bank name is required")
			return
		}
		if req.BankCurrency == "" {
			req.BankCurrency = "KES"
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendorID, _ := utils.ParseID(vendorIDStr)

		if req.IsDefault {
			_ = q.ClearVendorDefaultPayoutMethods(ctx, vendorID)
		}
		if err := q.UpdateVendorBankTransferMethod(ctx, sqlc.UpdateVendorBankTransferMethodParams{
			ID:                methodID,
			VendorID:          vendorID,
			AccountName:       req.AccountName,
			BankAccountNumber: req.BankAccountNumber,
			BankRoutingNumber: req.BankRoutingNumber,
			BankCurrency:      req.BankCurrency,
			IsDefault:         boolToInt16(req.IsDefault),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update bank account")
			return
		}
		row, err := q.GetVendorPayoutMethodByID(ctx, sqlc.GetVendorPayoutMethodByIDParams{
			ID: methodID, VendorID: vendorID,
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load payout method")
			return
		}
		utils.Success(c, toPayoutMethodResponse(row))
	}
}

// DeleteVendorPayoutMethod godoc
// @Summary Delete a payout method
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param methodId path string true "Payout method ID"
// @Success 200 {object} map[string]string
// @Router /vendor/payouts/methods/{methodId} [delete]
func DeleteVendorPayoutMethod() gin.HandlerFunc {
	return func(c *gin.Context) {
		methodID, ok := parsePathID(c, "methodId")
		if !ok {
			return
		}
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendorID, _ := utils.ParseID(vendorIDStr)

		count, err := q.CountVendorPayoutMethods(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to check payout methods")
			return
		}
		if count <= 1 {
			utils.Error(c, http.StatusBadRequest, "Cannot delete the only payout method")
			return
		}

		if err := q.DeleteVendorPayoutMethod(ctx, methodID, vendorID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete payout method")
			return
		}
		utils.Success(c, map[string]string{"message": "Payout method deleted"})
	}
}

// ListVendorPayoutHistory godoc
// @Summary Vendor payout history
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Router /vendor/payouts [get]
func ListVendorPayoutHistory() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, _ := utils.ParseID(vendorIDStr)
		page, limit, offset := pagination(c, 1, 20)
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		total, err := q.CountVendorPayouts(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to list payouts")
			return
		}
		rows, err := q.ListVendorPayouts(ctx, sqlc.ListVendorPayoutsParams{
			VendorID: vendorID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to list payouts")
			return
		}
		items := make([]models.VendorPayoutResponse, 0, len(rows))
		for _, row := range rows {
			items = append(items, toPayoutResponse(row))
		}
		respondPaginated(c, items, total, page, limit)
	}
}

func resolvePaystackRecipient(cfg *config.Config, method sqlc.VendorPayoutMethod) (string, error) {
	if method.Type == sqlc.VendorPayoutMethodsTypeMpesa {
		if method.BankName.Valid && strings.HasPrefix(method.BankName.String, "RCP_") {
			return method.BankName.String, nil
		}
		accountNumber, err := paystack.MpesaAccountNumberForTransfer(method.AccountRef)
		if err != nil {
			return "", err
		}
		data, err := paystackClient(cfg).CreateTransferRecipient(paystack.TransferRecipientRequest{
			Type:          "mobile_money",
			Name:          method.AccountName,
			AccountNumber: accountNumber,
			BankCode:      "MPESA",
			Currency:      "KES",
		})
		if err != nil {
			return "", err
		}
		return data.RecipientCode, nil
	}

	if method.Type == sqlc.VendorPayoutMethodsTypeBankTransfer {
		if method.BankName.Valid && strings.HasPrefix(method.BankName.String, "RCP_") {
			return method.BankName.String, nil
		}
		data, err := paystackClient(cfg).CreateTransferRecipient(paystack.TransferRecipientRequest{
			Type:          "bank_transfer",
			Name:          method.AccountName,
			AccountNumber: method.BankAccountNumber.String,
			BankCode:      method.BankRoutingNumber.String,
			Currency:      method.BankCurrency.String,
		})
		if err != nil {
			return "", err
		}
		return data.RecipientCode, nil
	}
	return "", fmt.Errorf("unsupported payout method type: %s", method.Type)
}

func processVendorSettlementWithdrawal(
	ctx context.Context,
	cfg *config.Config,
	q *sqlc.Queries,
	vendorID types.BinaryUUID,
	method sqlc.VendorPayoutMethod,
	settlements []sqlc.OrderVendorSettlement,
	requestedAmount *float64,
) (models.RequestVendorWithdrawalResponse, error) {
	var selected []sqlc.OrderVendorSettlement
	var selectedTotal float64
	if requestedAmount == nil {
		selected = settlements
		for _, s := range settlements {
			selectedTotal += store.ParseDecimalString(s.VendorEarnings)
		}
	} else {
		amount := *requestedAmount
		for _, s := range settlements {
			line := store.ParseDecimalString(s.VendorEarnings)
			if selectedTotal+line > amount+0.01 {
				break
			}
			selected = append(selected, s)
			selectedTotal += line
		}
	}
	if selectedTotal < minWithdrawalKES {
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("not enough settled earnings to withdraw")
	}
	amount := math.Floor(selectedTotal*100) / 100

	periodStart := time.Now()
	periodEnd := time.Now()
	if len(selected) > 0 {
		periodStart = selected[0].UpdatedAt
		periodEnd = selected[len(selected)-1].UpdatedAt
	}

	payoutID := utils.GenerateBinaryID()
	if err := q.CreateVendorPayout(ctx, sqlc.CreateVendorPayoutParams{
		ID:             payoutID,
		VendorID:       vendorID,
		PayoutMethodID: method.ID,
		Amount:         store.FloatToDecimalString(amount),
		Status:         sqlc.VendorPayoutsStatusProcessing,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		Reference:      sql.NullString{},
	}); err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}
	for _, settlement := range selected {
		lineItem, err := q.GetFirstOrderItemForVendorOrder(ctx, settlement.OrderID, vendorID)
		if err != nil {
			return models.RequestVendorWithdrawalResponse{}, err
		}
		if err := q.CreateVendorPayoutItem(ctx, sqlc.CreateVendorPayoutItemParams{
			PayoutID:    payoutID,
			OrderItemID: lineItem.ID,
			Amount:      settlement.VendorEarnings,
		}); err != nil {
			return models.RequestVendorWithdrawalResponse{}, err
		}
		if err := q.MarkOrderVendorSettlementPaid(ctx, settlement.ID, vendorID); err != nil {
			return models.RequestVendorWithdrawalResponse{}, err
		}
	}

	recipient, err := resolvePaystackRecipient(cfg, method)
	if err != nil {
		_ = q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
			Status: sqlc.VendorPayoutsStatusFailed, Reference: sql.NullString{},
			StatusEq: sqlc.VendorPayoutsStatusPaid, AdminNote: sql.NullString{String: err.Error(), Valid: true}, ID: payoutID,
		})
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("payout transfer setup failed: %w", err)
	}
	if (method.Type == sqlc.VendorPayoutMethodsTypeMpesa && (!method.BankName.Valid || method.BankName.String != recipient)) ||
		(method.Type == sqlc.VendorPayoutMethodsTypeBankTransfer && (!method.BankName.Valid || method.BankName.String != recipient)) {
		_ = q.UpdateVendorPayoutMethodRecipient(ctx, sqlc.UpdateVendorPayoutMethodRecipientParams{
			BankName: sql.NullString{String: recipient, Valid: true}, ID: method.ID, VendorID: vendorID,
		})
	}

	transfer, err := paystackClient(cfg).InitiateTransfer(paystack.TransferRequest{
		Source: "balance", Amount: paystack.AmountToKobo(amount), Recipient: recipient,
		Reason: "Lumi vendor earnings", Currency: "KES",
	})
	if err != nil {
		_ = q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
			Status: sqlc.VendorPayoutsStatusFailed, Reference: sql.NullString{},
			StatusEq: sqlc.VendorPayoutsStatusPaid, AdminNote: sql.NullString{String: err.Error(), Valid: true}, ID: payoutID,
		})
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("payout transfer failed: %w", err)
	}

	ref := transfer.Reference
	if ref == "" {
		ref = transfer.TransferCode
	}
	status := sqlc.VendorPayoutsStatusPaid
	if strings.ToLower(transfer.Status) != "success" {
		status = sqlc.VendorPayoutsStatusProcessing
	}
	if err := q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
		Status: status, Reference: sql.NullString{String: ref, Valid: ref != ""},
		StatusEq: sqlc.VendorPayoutsStatusPaid, AdminNote: sql.NullString{}, ID: payoutID,
	}); err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}

	row := sqlc.VendorPayout{
		ID: payoutID, VendorID: vendorID, PayoutMethodID: method.ID,
		Amount: store.FloatToDecimalString(amount), Currency: "KES", Status: status,
		PeriodStart: periodStart, PeriodEnd: periodEnd,
		Reference: sql.NullString{String: ref, Valid: ref != ""}, CreatedAt: time.Now(),
	}
	if status == sqlc.VendorPayoutsStatusPaid {
		row.CompletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	}
	return models.RequestVendorWithdrawalResponse{Payout: toPayoutResponse(row)}, nil
}

func processVendorWithdrawal(ctx context.Context, cfg *config.Config, q *sqlc.Queries, vendorID types.BinaryUUID, requestedAmount *float64) (models.RequestVendorWithdrawalResponse, error) {
	method, err := q.GetDefaultVendorPayoutMethod(ctx, vendorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("add a payout method before withdrawing")
		}
		return models.RequestVendorWithdrawalResponse{}, err
	}

	balance, err := vendorAvailableBalance(ctx, q, vendorID)
	if err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}
	amount := balance
	if requestedAmount != nil {
		amount = *requestedAmount
	}
	amount = math.Floor(amount*100) / 100
	if amount < minWithdrawalKES {
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("minimum withdrawal is KES %.0f", minWithdrawalKES)
	}
	if amount > balance+0.01 {
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("insufficient balance")
	}

	settlements, err := q.ListPayableVendorSettlements(ctx, vendorID)
	if err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}
	if len(settlements) > 0 {
		return processVendorSettlementWithdrawal(ctx, cfg, q, vendorID, method, settlements, requestedAmount)
	}

	items, err := q.ListPayableOrderItems(ctx, vendorID)
	if err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}
	if len(items) == 0 {
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("no delivered orders available for payout")
	}

	var selected []sqlc.ListPayableOrderItemsRow
	var selectedTotal float64
	if requestedAmount == nil {
		selected = items
		for _, item := range items {
			selectedTotal += store.ToFloat(item.VendorEarnings)
		}
	} else {
		for _, item := range items {
			itemAmount := store.ToFloat(item.VendorEarnings)
			if selectedTotal+itemAmount > amount+0.01 {
				break
			}
			selected = append(selected, item)
			selectedTotal += itemAmount
		}
	}
	if selectedTotal < minWithdrawalKES {
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("not enough settled earnings to withdraw")
	}
	amount = math.Floor(selectedTotal*100) / 100

	periodStart := time.Now()
	periodEnd := time.Now()
	if selected[0].DeliveredAt.Valid {
		periodStart = selected[0].DeliveredAt.Time
	}
	if last := selected[len(selected)-1].DeliveredAt; last.Valid {
		periodEnd = last.Time
	}

	payoutID := utils.GenerateBinaryID()
	if err := q.CreateVendorPayout(ctx, sqlc.CreateVendorPayoutParams{
		ID:             payoutID,
		VendorID:       vendorID,
		PayoutMethodID: method.ID,
		Amount:         store.FloatToDecimalString(amount),
		Status:         sqlc.VendorPayoutsStatusProcessing,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		Reference:      sql.NullString{},
	}); err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}
	for _, item := range selected {
		if err := q.CreateVendorPayoutItem(ctx, sqlc.CreateVendorPayoutItemParams{
			PayoutID:    payoutID,
			OrderItemID: item.ID,
			Amount:      item.VendorEarnings,
		}); err != nil {
			return models.RequestVendorWithdrawalResponse{}, err
		}
	}

	recipient, err := resolvePaystackRecipient(cfg, method)
	if err != nil {
		_ = q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
			Status:    sqlc.VendorPayoutsStatusFailed,
			Reference: sql.NullString{},
			StatusEq:  sqlc.VendorPayoutsStatusPaid,
			AdminNote: sql.NullString{String: err.Error(), Valid: true},
			ID:        payoutID,
		})
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("M-Pesa transfer setup failed: %w", err)
	}
	if !method.BankName.Valid || method.BankName.String != recipient {
		_ = q.UpdateVendorPayoutMethodRecipient(ctx, sqlc.UpdateVendorPayoutMethodRecipientParams{
			BankName: sql.NullString{String: recipient, Valid: true},
			ID:       method.ID,
			VendorID: vendorID,
		})
	}

	transfer, err := paystackClient(cfg).InitiateTransfer(paystack.TransferRequest{
		Source:    "balance",
		Amount:    paystack.AmountToKobo(amount),
		Recipient: recipient,
		Reason:    "Lumi vendor earnings",
		Currency:  "KES",
	})
	if err != nil {
		_ = q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
			Status:    sqlc.VendorPayoutsStatusFailed,
			Reference: sql.NullString{},
			StatusEq:  sqlc.VendorPayoutsStatusPaid,
			AdminNote: sql.NullString{String: err.Error(), Valid: true},
			ID:        payoutID,
		})
		return models.RequestVendorWithdrawalResponse{}, fmt.Errorf("M-Pesa transfer failed: %w", err)
	}

	ref := transfer.Reference
	if ref == "" {
		ref = transfer.TransferCode
	}
	status := sqlc.VendorPayoutsStatusPaid
	if strings.ToLower(transfer.Status) != "success" {
		status = sqlc.VendorPayoutsStatusProcessing
	}
	if err := q.UpdateVendorPayoutStatus(ctx, sqlc.UpdateVendorPayoutStatusParams{
		Status:    status,
		Reference: sql.NullString{String: ref, Valid: ref != ""},
		StatusEq:  sqlc.VendorPayoutsStatusPaid,
		AdminNote: sql.NullString{},
		ID:        payoutID,
	}); err != nil {
		return models.RequestVendorWithdrawalResponse{}, err
	}

	row := sqlc.VendorPayout{
		ID:             payoutID,
		VendorID:       vendorID,
		PayoutMethodID: method.ID,
		Amount:         store.FloatToDecimalString(amount),
		Currency:       "KES",
		Status:         status,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		Reference:      sql.NullString{String: ref, Valid: ref != ""},
		CreatedAt:      time.Now(),
	}
	if status == sqlc.VendorPayoutsStatusPaid {
		row.CompletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	}
	return models.RequestVendorWithdrawalResponse{Payout: toPayoutResponse(row)}, nil
}

// RequestVendorWithdrawal godoc
// @Summary Withdraw vendor earnings
// @Description Transfers available earnings from delivered orders to the vendor's default payout method via Paystack.
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param Idempotency-Key header string false "Prevents duplicate withdrawal requests"
// @Param body body models.RequestVendorWithdrawalRequest false "Optional partial amount"
// @Success 200 {object} models.RequestVendorWithdrawalResponse
// @Router /vendor/payouts/withdraw [post]
func RequestVendorWithdrawal(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}

		rawBody, err := io.ReadAll(c.Request.Body)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid request")
			return
		}
		var req models.RequestVendorWithdrawalRequest
		if len(rawBody) > 0 {
			if err := json.Unmarshal(rawBody, &req); err != nil {
				utils.Error(c, http.StatusBadRequest, "Invalid request")
				return
			}
		}

		vendorID, _ := utils.ParseID(vendorIDStr)
		q := getStore(c).Queries()
		clientKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
		endpoint := "POST /vendor/payouts/withdraw"

		idempotency.WithKey(c, q, userID, endpoint, clientKey, rawBody, func() (int, interface{}, error) {
			resp, err := processVendorWithdrawal(c.Request.Context(), cfg, q, vendorID, req.Amount)
			if err != nil {
				code := http.StatusBadRequest
				if strings.Contains(err.Error(), "payout transfer") {
					code = http.StatusBadGateway
				}
				return code, nil, err
			}
			return http.StatusOK, resp, nil
		})
	}
}
