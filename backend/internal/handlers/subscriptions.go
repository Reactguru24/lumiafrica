package handlers

import (
	"database/sql"
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/plans"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetSubscriptionPlans godoc
// @Summary Get subscription plans
// @Description Returns subscription plans created in the Paystack dashboard
// @Tags Subscription
// @Produce json
// @Success 200 {object} map[string]models.SubscriptionPlanConfig
// @Router /subscriptions/plans [get]
func GetSubscriptionPlans(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		planList, err := plans.ListFromPaystack(cfg)
		if err != nil {
			utils.Error(c, http.StatusBadGateway, "Failed to load subscription plans: "+err.Error())
			return
		}
		utils.Success(c, planList)
	}
}

// GetVendorSubscription godoc
// @Summary Get active subscription
// @Description Get the current vendor's active subscription
// @Tags Subscription
// @Produce json
// @Security Bearer
// @Success 200 {object} models.SubscriptionResponse
// @Router /vendor/subscriptions/active [get]
func GetVendorSubscription() gin.HandlerFunc {
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
		row, err := getStore(c).Queries().GetActiveSubscription(c.Request.Context(), vendorID)
		if handleNotFound(c, err, "No active subscription", "Failed to fetch subscription") {
			return
		}
		utils.Success(c, toSubscriptionResponse(c.MustGet("config").(*config.Config), store.ToSubscription(row)))
	}
}

// GetVendorSubscriptionHistory godoc
// @Summary Get subscription history
// @Description Get vendor's subscription history
// @Tags Subscription
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.SubscriptionResponse}
// @Router /vendor/subscriptions/history [get]
func GetVendorSubscriptionHistory() gin.HandlerFunc {
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
			responses[i] = toSubscriptionResponse(c.MustGet("config").(*config.Config), store.ToSubscription(row))
		}
		respondPaginated(c, responses, total, page, limit)
	}
}

// SubscribeVendor godoc
// @Summary Subscribe to a featured listing plan
// @Description Alias for subscription payment initialization via Paystack
// @Tags Subscription
// @Accept json
// @Produce json
// @Security Bearer
// @Param subscription body models.SubscribeRequest true "Subscription details"
// @Success 200 {object} models.PaymentInitializeResponse
// @Router /vendor/subscriptions [post]
func SubscribeVendor(cfg *config.Config) gin.HandlerFunc {
	return InitializeSubscriptionPayment(cfg)
}

// CancelSubscription godoc
// @Summary Cancel subscription
// @Description Cancel the vendor's active subscription
// @Tags Subscription
// @Produce json
// @Security Bearer
// @Success 200 {object} models.SubscriptionResponse
// @Router /vendor/subscriptions/active [delete]
func CancelSubscription() gin.HandlerFunc {
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
		row.Active = 0
		utils.Success(c, toSubscriptionResponse(c.MustGet("config").(*config.Config), store.ToSubscription(row)))
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
// @Tags Subscription
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 10, max 100)"
// @Param active query bool false "Filter by active status"
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
				ID:            row.ID.String(),
				VendorID:      row.VendorID.String(),
				VendorName:    vendorName,
				VendorLogo:    vendorLogo,
				Plan:          string(row.Plan),
				Amount:        store.ToFloat(row.AmountPaid),
				PaymentMethod: row.PaymentMethod,
				StartedAt:     row.StartedAt,
				ExpiresAt:     row.ExpiresAt,
				Active:        row.Active != 0,
			}
		}
		respondPaginated(c, adminRows, total, page, limit)
	}
}

func toSubscriptionResponse(cfg *config.Config, sub models.VendorSubscription) models.SubscriptionResponse {
	planName := string(sub.Plan)
	daysLeft := int(sub.ExpiresAt.Sub(time.Now()).Hours() / 24)
	if daysLeft < 0 {
		daysLeft = 0
	}
	if cfg != nil {
		if plan, err := plans.Get(cfg, string(sub.Plan)); err == nil {
			planName = plan.Label
		}
	}
	return models.SubscriptionResponse{
		ID: sub.ID, VendorID: sub.VendorID, Plan: sub.Plan, PlanName: planName,
		AmountPaid: sub.AmountPaid, PaymentMethod: sub.PaymentMethod,
		StartedAt: sub.StartedAt, ExpiresAt: sub.ExpiresAt, Active: sub.Active, DaysLeft: daysLeft,
	}
}
