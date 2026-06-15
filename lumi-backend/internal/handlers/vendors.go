package handlers

import (
	"database/sql"
	"errors"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListVendors godoc
// @Summary Search and list vendors
// @Description Search and list vendors. All filters are optional.
// @Tags Guest
// @Produce json
// @Param q query string false "Search query"
// @Param search query string false "Alias for q"
// @Param category query string false "Category filter"
// @Param minRating query string false "Minimum rating from 0 to 5"
// @Param country query string false "Country filter"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {array} models.Vendor
// @Router /vendors [get]
func ListVendors() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountSearchVendors(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch vendors")
			return
		}
		rows, err := q.SearchVendors(ctx, sqlc.SearchVendorsParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch vendors")
			return
		}
		respondPaginated(c, store.ToVendors(rows), total, page, limit)
	}
}

// GetVendor godoc
// @Summary Get vendor details
// @Description Get a vendor by ID
// @Tags Guest
// @Produce json
// @Param vendorID path string true "Vendor ID"
// @Success 200 {object} models.Vendor
// @Router /vendors/{vendorID} [get]
func GetVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		row, err := getStore(c).Queries().GetVendorByID(c.Request.Context(), c.Param("vendorID"))
		if handleNotFound(c, err, "Vendor not found", "Failed to fetch vendor") {
			return
		}
		utils.Success(c, store.ToVendor(row))
	}
}

// ApplyVendor godoc
// @Summary Apply to become a vendor
// @Description Submit a vendor application
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param application body models.CreateVendorApplicationRequest true "Application details"
// @Success 201 {object} models.VendorApplication
// @Router /vendors/applications [post]
func ApplyVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		var req models.CreateVendorApplicationRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetPendingApplicationByUser(ctx, userID); err == nil {
			utils.Error(c, http.StatusConflict, "You already have an application under review")
			return
		}
		if _, err := q.GetVendorByUserID(ctx, userID); err == nil {
			utils.Error(c, http.StatusConflict, "You already have a vendor profile")
			return
		}

		applicant, err := q.GetUserByID(ctx, userID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to verify account")
			return
		}
		businessEmail := normalizeEmail(req.BusinessEmail)
		if businessEmail == normalizeEmail(applicant.Email) {
			utils.Error(c, http.StatusBadRequest, "Business email must be different from your account email")
			return
		}
		if _, err := q.GetPendingApplicationByBusinessEmail(ctx, businessEmail); err == nil {
			utils.Error(c, http.StatusConflict, errApplicationUnderReviewForEmail(businessEmail))
			return
		} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
			utils.Error(c, http.StatusInternalServerError, "Failed to validate business email")
			return
		}
		if existing, err := q.GetUserByEmail(ctx, req.BusinessEmail); err == nil && existing.ID != userID {
			utils.Error(c, http.StatusConflict, "This business email is already registered to another account")
			return
		} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
			utils.Error(c, http.StatusInternalServerError, "Failed to validate business email")
			return
		}

		appID := utils.GenerateID()
		if err := q.CreateVendorApplication(ctx, sqlc.CreateVendorApplicationParams{
			ID:                  appID,
			UserID:              userID,
			StoreName:           req.StoreName,
			BusinessDescription: req.BusinessDescription,
			Logo:                req.Logo,
			BusinessEmail:       req.BusinessEmail,
			ContactPhone:        req.ContactPhone,
			Country:             req.Country,
			City:                req.City,
			RegistrationNumber:  req.RegistrationNumber,
			Categories:          store.StringArrayToJSON(req.Categories),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create application")
			return
		}

		app, _ := q.GetApplicationByID(ctx, appID)
		utils.SuccessCreated(c, store.ToApplication(app))
	}
}

// GetMyVendorApplication godoc
// @Summary Get my vendor application
// @Description Get the authenticated customer's latest vendor application
// @Tags Customer
// @Produce json
// @Security Bearer
// @Success 200 {object} models.VendorApplication
// @Router /vendors/applications/me [get]
func GetMyVendorApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		app, err := getStore(c).Queries().GetLatestApplicationByUser(c.Request.Context(), userID)
		if errors.Is(err, sql.ErrNoRows) {
			utils.Success(c, nil)
			return
		}
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch application")
			return
		}
		utils.Success(c, store.ToApplication(app))
	}
}

// GetVendorProfile godoc
// @Summary Get vendor profile
// @Description Get the authenticated vendor's profile
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} models.Vendor
// @Router /vendor/profile [get]
func GetVendorProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		row, err := getStore(c).Queries().GetVendorByUserID(c.Request.Context(), middleware.GetUserID(c))
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}
		utils.Success(c, store.ToVendor(row))
	}
}

// UpdateVendorProfile godoc
// @Summary Update vendor profile
// @Description Update the authenticated vendor's profile
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param updates body models.UpdateVendorProfileRequest true "Profile updates"
// @Success 200 {object} models.Vendor
// @Router /vendor/profile [put]
func UpdateVendorProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		var req models.UpdateVendorProfileRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetVendorByUserID(ctx, userID); handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}

		params := sqlc.UpdateVendorProfileParams{UserID: userID}
		if req.StoreName != nil {
			params.StoreName = sql.NullString{String: *req.StoreName, Valid: true}
		}
		if req.Description != nil {
			params.Description = sql.NullString{String: *req.Description, Valid: true}
		}
		if req.Logo != nil {
			params.Logo = sql.NullString{String: *req.Logo, Valid: true}
		}
		if req.Banner != nil {
			params.Banner = sql.NullString{String: *req.Banner, Valid: true}
		}
		if req.ContactPhone != nil {
			params.ContactPhone = sql.NullString{String: *req.ContactPhone, Valid: true}
		}

		if err := q.UpdateVendorProfile(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update profile")
			return
		}

		row, _ := q.GetVendorByUserID(ctx, userID)
		utils.Success(c, store.ToVendor(row))
	}
}

// GetFeaturedVendors godoc
// @Summary      Get featured vendors for homepage carousel
// @Description  Fetch vendors marked as featured on the homepage. Only returns vendors with active subscriptions. Results are sorted by total sales and subscription plan.
// @Tags         Guest
// @Produce      json
// @Param        limit query int false "Maximum number of vendors to return (default: 6, max: 20)"
// @Success      200  {array} models.Vendor
// @Router       /vendors/featured [get]
func GetFeaturedVendors() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		limit := 6
		if l := c.Query("limit"); l != "" {
			if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 20 {
				limit = v
			}
		}

		rows, err := q.GetFeaturedVendors(ctx, int32(limit))
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured vendors")
			return
		}
		utils.Success(c, store.ToVendors(rows))
	}
}
