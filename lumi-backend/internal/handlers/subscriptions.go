package handlers

import (
	"database/sql"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetSubscriptionPlans godoc
// @Summary Get subscription plans
// @Description Get available subscription plans for vendors
// @Tags Guest
// @Produce json
// @Success 200 {object} map[string]models.SubscriptionPlanConfig
// @Router /subscriptions/plans [get]
func GetSubscriptionPlans() gin.HandlerFunc {
	return func(c *gin.Context) {
		utils.Success(c, models.SubscriptionPlans)
	}
}

// GetVendorSubscription godoc
// @Summary Get active subscription
// @Description Get the current vendor's active subscription
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} models.SubscriptionResponse
// @Router /vendor/subscriptions/active [get]
func GetVendorSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		row, err := getStore(c).Queries().GetActiveSubscription(c.Request.Context(), vendorID)
		if handleNotFound(c, err, "No active subscription", "Failed to fetch subscription") {
			return
		}
		utils.Success(c, toSubscriptionResponse(store.ToSubscription(row)))
	}
}

// GetVendorSubscriptionHistory godoc
// @Summary Get subscription history
// @Description Get vendor's subscription history
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.SubscriptionResponse}
// @Router /vendor/subscriptions/history [get]
func GetVendorSubscriptionHistory() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountSubscriptionsByVendor(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch subscriptions")
			return
		}
		rows, err := q.ListSubscriptionsByVendor(ctx, sqlc.ListSubscriptionsByVendorParams{
			VendorID: vendorID, Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch subscriptions")
			return
		}

		responses := make([]models.SubscriptionResponse, len(rows))
		for i, row := range rows {
			responses[i] = toSubscriptionResponse(store.ToSubscription(row))
		}
		respondPaginated(c, responses, total, page, limit)
	}
}

// SubscribeVendor godoc
// @Summary Subscribe to a plan
// @Description Create a new vendor subscription
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param subscription body models.SubscribeRequest true "Subscription details"
// @Success 201 {object} models.SubscriptionResponse
// @Router /vendor/subscriptions [post]
func SubscribeVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		var req models.SubscribeRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()

		plan := models.GetPlan(req.Plan)
		if plan == nil {
			utils.Error(c, http.StatusBadRequest, "Invalid subscription plan")
			return
		}

		_ = q.DeactivateVendorSubscriptions(ctx, vendorID)
		now := time.Now()
		subID := utils.GenerateID()
		if err := q.CreateSubscription(ctx, sqlc.CreateSubscriptionParams{
			ID: subID, VendorID: vendorID, Plan: sqlc.VendorSubscriptionsPlan(req.Plan),
			AmountPaid: store.FloatToDecimalString(plan.PriceKES), PaymentMethod: req.PaymentMethod,
			StartedAt: now, ExpiresAt: now.AddDate(0, plan.DurationMonths, 0),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create subscription")
			return
		}

		row, _ := q.GetActiveSubscription(ctx, vendorID)
		utils.SuccessCreated(c, toSubscriptionResponse(store.ToSubscription(row)))
	}
}

// CancelSubscription godoc
// @Summary Cancel subscription
// @Description Cancel the vendor's active subscription
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} models.SubscriptionResponse
// @Router /vendor/subscriptions/active [delete]
func CancelSubscription() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetActiveSubscription(ctx, vendorID)
		if handleNotFound(c, err, "No active subscription to cancel", "Failed to fetch subscription") {
			return
		}
		if err := q.DeactivateSubscription(ctx, row.ID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to cancel subscription")
			return
		}
		row.Active = sql.NullBool{Bool: false, Valid: true}
		utils.Success(c, toSubscriptionResponse(store.ToSubscription(row)))
	}
}

type AdminSubscriptionRow struct {
	ID            string    `json:"id"`
	VendorID      string    `json:"vendorId"`
	VendorName    string    `json:"vendorName"`
	VendorLogo    string    `json:"vendorLogo"`
	Plan          string    `json:"plan"`
	Amount        float64   `json:"amount"`
	PaymentMethod string    `json:"paymentMethod"`
	StartedAt     time.Time `json:"startedAt"`
	ExpiresAt     time.Time `json:"expiresAt"`
	Active        bool      `json:"active"`
}

// GetAdminSubscriptions godoc
// @Summary List all subscriptions
// @Description Admin lists all vendor subscriptions
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]handlers.AdminSubscriptionRow}
// @Router /admin/subscriptions [get]
func GetAdminSubscriptions() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		var activeFilter sql.NullBool
		if activeStr := c.Query("active"); activeStr != "" {
			activeFilter = sql.NullBool{Bool: activeStr == "true", Valid: true}
		}

		total, err := q.CountAllSubscriptions(ctx, sqlc.CountAllSubscriptionsParams{Active: activeFilter})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch subscriptions")
			return
		}
		rows, err := q.ListAllSubscriptions(ctx, sqlc.ListAllSubscriptionsParams{
			Active: activeFilter, Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch subscriptions")
			return
		}

		adminRows := make([]AdminSubscriptionRow, len(rows))
		for i, row := range rows {
			vendor, verr := q.GetVendorByID(ctx, row.VendorID)
			vendorName := ""
			vendorLogo := ""
			if verr == nil {
				vendorName = vendor.StoreName
				vendorLogo = vendor.Logo
			}
			adminRows[i] = AdminSubscriptionRow{
				ID:            row.ID,
				VendorID:      row.VendorID,
				VendorName:    vendorName,
				VendorLogo:    vendorLogo,
				Plan:          string(row.Plan),
				Amount:        parseDecimal(row.AmountPaid),
				PaymentMethod: row.PaymentMethod,
				StartedAt:     row.StartedAt,
				ExpiresAt:     row.ExpiresAt,
				Active:        row.Active.Bool,
			}
		}
		respondPaginated(c, adminRows, total, page, limit)
	}
}

func toSubscriptionResponse(sub models.VendorSubscription) models.SubscriptionResponse {
	planName := "Unknown"
	if plan := models.GetPlan(sub.Plan); plan != nil {
		planName = plan.Label
	}
	daysLeft := int(sub.ExpiresAt.Sub(time.Now()).Hours() / 24)
	if daysLeft < 0 {
		daysLeft = 0
	}
	return models.SubscriptionResponse{
		ID: sub.ID, VendorID: sub.VendorID, Plan: sub.Plan, PlanName: planName,
		AmountPaid: sub.AmountPaid, PaymentMethod: sub.PaymentMethod,
		StartedAt: sub.StartedAt, ExpiresAt: sub.ExpiresAt, Active: sub.Active, DaysLeft: daysLeft,
	}
}
