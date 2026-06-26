package handlers

import (
	"database/sql"
	"errors"
	"lumi-backend/internal/config"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/plans"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func adminProductSearchQuery(c *gin.Context) string {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		q = strings.TrimSpace(c.Query("search"))
	}
	return q
}

// ListUsers godoc
// @Summary List all users
// @Description Admin lists all users in the system
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 10, max 100)"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.User}
// @Router /admin/users [get]
func ListUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountUsers(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch users")
			return
		}
		rows, err := q.ListUsers(ctx, sqlc.ListUsersParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch users")
			return
		}

		users := make([]models.User, len(rows))
		for i, row := range rows {
			users[i] = models.User{
				ID: row.ID.String(), FullName: row.FullName, Email: row.Email, Phone: row.Phone,
				Role: models.UserRole(row.Role), Avatar: nullStringToPtr(row.Avatar),
				Disabled: row.Disabled != 0, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
			}
		}
		respondPaginated(c, users, total, page, limit)
	}
}

// DisableUser godoc
// @Summary Disable a user
// @Description Admin disables a customer or vendor account (not admins or self)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param userID path string true "User ID"
// @Success 200 {object} models.User
// @Router /admin/users/{userID}/disable [post]
func DisableUser() gin.HandlerFunc {
	return setUserDisabled(true)
}

// EnableUser godoc
// @Summary Enable a user
// @Description Admin re-activates a previously disabled customer or vendor account
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param userID path string true "User ID"
// @Success 200 {object} models.User
// @Router /admin/users/{userID}/enable [post]
func EnableUser() gin.HandlerFunc {
	return setUserDisabled(false)
}

func setUserDisabled(disabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := parsePathID(c, "userID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetUserByID(ctx, userID)
		if handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}
		if !adminCanModifyUserAccount(c, row) {
			return
		}
		if disabled {
			if err := q.DisableUser(ctx, userID); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to disable user")
				return
			}
		} else {
			if err := q.EnableUser(ctx, userID); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to enable user")
				return
			}
		}
		updated, err := q.GetUserByID(ctx, userID)
		if handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}
		user := store.ToUser(updated)
		user.Sanitize()
		utils.Success(c, user)
	}
}

func adminCanModifyUserAccount(c *gin.Context, target sqlc.User) bool {
	actorID := middleware.GetUserID(c)
	if target.ID.String() == actorID {
		utils.Error(c, http.StatusForbidden, "You cannot change your own account status")
		return false
	}
	if target.Role == sqlc.UsersRoleADMIN {
		utils.Error(c, http.StatusForbidden, "Admin accounts cannot be enabled or disabled")
		return false
	}
	return true
}

// ListAdminProducts godoc
// @Summary List all products for admin
// @Description Admin lists all non-archived products for moderation
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 50, max 100)"
// @Param q query string false "Search by name, brand, SKU, or description"
// @Param search query string false "Alias for q"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Product}
// @Router /admin/products [get]
func ListAdminProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 50)
		search := adminProductSearchQuery(c)

		var total int64
		var rows []sqlc.Product
		var err error

		if search != "" {
			pattern := "%" + search + "%"
			total, err = q.CountAdminProductsSearch(ctx, sqlc.CountAdminProductsSearchParams{Search: pattern})
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
				return
			}
			rows, err = q.ListAdminProductsSearch(ctx, sqlc.ListAdminProductsSearchParams{
				Search: pattern, Limit: int32(limit), Offset: int32(offset),
			})
		} else {
			total, err = q.CountAdminProducts(ctx)
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
				return
			}
			rows, err = q.ListAdminProducts(ctx, sqlc.ListAdminProductsParams{Limit: int32(limit), Offset: int32(offset)})
		}
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		respondPaginated(c, store.ToProducts(rows), total, page, limit)
	}
}

// ListPendingProducts godoc
// @Summary List pending products
// @Description Admin lists all pending product approvals
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 10, max 100)"
// @Param q query string false "Search by name, brand, SKU, or description"
// @Param search query string false "Alias for q"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Product}
// @Router /admin/products/pending [get]
func ListPendingProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)
		search := adminProductSearchQuery(c)

		var total int64
		var rows []sqlc.Product
		var err error

		if search != "" {
			pattern := "%" + search + "%"
			total, err = q.CountPendingProductsSearch(ctx, sqlc.CountPendingProductsSearchParams{Search: pattern})
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
				return
			}
			rows, err = q.ListPendingProductsSearch(ctx, sqlc.ListPendingProductsSearchParams{
				Search: pattern, Limit: int32(limit), Offset: int32(offset),
			})
		} else {
			total, err = q.CountPendingProducts(ctx)
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
				return
			}
			rows, err = q.ListPendingProducts(ctx, sqlc.ListPendingProductsParams{Limit: int32(limit), Offset: int32(offset)})
		}
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		respondPaginated(c, store.ToProducts(rows), total, page, limit)
	}
}

// ModerateProduct godoc
// @Summary Moderate a product
// @Description Admin approves or rejects a product
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Param moderation body models.ModerateProductDecisionRequest true "Moderation decision"
// @Success 200 {object} models.Product
// @Router /admin/products/{productID}/moderate [post]
func ModerateProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		var req models.ModerateProductDecisionRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetProductByIDAny(ctx, productID); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		status := sqlc.ProductsStatusHidden
		if req.Approved {
			status = sqlc.ProductsStatusActive
		}
		if req.Archive {
			status = sqlc.ProductsStatusArchived
		}

		if err := q.ModerateProduct(ctx, sqlc.ModerateProductParams{
			Status: status, ID: productID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to moderate product")
			return
		}
		updated, err := q.GetProductByIDAny(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		invalidateCatalogCache(c)
		utils.Success(c, store.ToProduct(updated))
	}
}

// ListVendorApplications godoc
// @Summary List vendor applications
// @Description Admin lists all pending vendor applications
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 10, max 100)"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.VendorApplication}
// @Router /admin/vendors/applications [get]
func ListVendorApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountPendingApplications(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch applications")
			return
		}
		rows, err := q.ListPendingApplications(ctx, sqlc.ListPendingApplicationsParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch applications")
			return
		}
		respondPaginated(c, store.ToApplications(rows), total, page, limit)
	}
}

// ApproveVendor godoc
// @Summary Approve vendor application
// @Description Admin approves a vendor application
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param applicationID path string true "Application ID"
// @Param approval body models.ApproveVendorRequest true "Approval details"
// @Success 200 {object} map[string]interface{}
// @Router /admin/vendor-applications/{applicationID}/approve [post]
func ApproveVendor(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationID, ok := parsePathID(c, "applicationID")
		if !ok {
			return
		}
		var req models.ApproveVendorRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		st := getStore(c)
		q := st.Queries()
		app, err := q.GetApplicationByID(ctx, applicationID)
		if handleNotFound(c, err, "Application not found", "Failed to fetch application") {
			return
		}
		if app.Status != sqlc.VendorApplicationsStatusPending {
			utils.Error(c, http.StatusConflict, "Only pending applications can be approved")
			return
		}

		applicantEmail := normalizeEmail(app.BusinessEmail)
		if app.UserID != nil && !app.UserID.IsZero() {
			applicant, err := q.GetUserByID(ctx, *app.UserID)
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to load applicant account")
				return
			}
			applicantEmail = applicant.Email
		}

		tx, err := st.DB().SQL.BeginTx(ctx, nil)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to start transaction")
			return
		}
		qtx := q.WithTx(tx)
		now := utils.Now()
		reviewNote := sql.NullString{String: derefString(req.ReviewNote), Valid: req.ReviewNote != nil}

		vendorUserID, err := resolveVendorAccountUser(ctx, qtx, app)
		if err != nil {
			tx.Rollback()
			switch {
			case errors.Is(err, ErrBusinessEmailNotVendor):
				utils.Error(c, http.StatusConflict, "Business email is already registered to a non-vendor account")
			case errors.Is(err, ErrVendorAccountExists):
				utils.Error(c, http.StatusConflict, "A vendor account already exists for this business email")
			default:
				utils.Error(c, http.StatusInternalServerError, "Failed to create vendor account")
			}
			return
		}

		vendorID := utils.GenerateBinaryID()
		logo := app.VendorPhoto
		if logo == "" {
			logo = app.Logo
		}
		banner := app.BusinessPhoto
		if err := qtx.CreateVendor(ctx, sqlc.CreateVendorParams{
			ID: vendorID, UserID: vendorUserID, StoreName: app.StoreName,
			Slug:          utils.GenerateIDWithPrefix(app.StoreName),
			Description:   sql.NullString{String: app.BusinessDescription, Valid: true},
			Logo:          logo,
			Banner:        sql.NullString{String: banner, Valid: banner != ""},
			ContactPhone:  app.ContactPhone,
			BusinessEmail: app.BusinessEmail, Country: app.Country, City: app.City,
		}); err != nil {
			tx.Rollback()
			utils.Error(c, http.StatusInternalServerError, "Failed to create vendor")
			return
		}
		if err := qtx.ApproveApplication(ctx, sqlc.ApproveApplicationParams{
			ReviewNote: reviewNote, ReviewedAt: sql.NullTime{Time: now, Valid: true}, ID: applicationID,
		}); err != nil {
			tx.Rollback()
			utils.Error(c, http.StatusInternalServerError, "Failed to update application")
			return
		}
		if err := tx.Commit(); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to commit transaction")
			return
		}

		activation, err := sendVendorActivationEmail(ctx, cfg, q, vendorUserID, app.BusinessEmail, app.StoreName, applicantEmail)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Vendor approved but failed to create activation link")
			return
		}

		vendor, _ := q.GetVendorByID(ctx, vendorID)
		response := vendorActivationResponse(
			cfg,
			activation,
			"Vendor approved. An activation email was sent to the business email address.",
			"Vendor approved. SMTP is not configured — see server logs for the activation link.",
		)
		response["vendor"] = store.ToVendor(vendor)
		utils.Success(c, response)
	}
}

// RejectVendor godoc
// @Summary Reject vendor application
// @Description Admin rejects a vendor application
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param applicationID path string true "Application ID"
// @Param rejection body models.RejectVendorRequest true "Rejection details"
// @Success 200 {object} map[string]interface{}
// @Router /admin/vendor-applications/{applicationID}/reject [post]
func RejectVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationID, ok := parsePathID(c, "applicationID")
		if !ok {
			return
		}
		var req models.RejectVendorRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetApplicationByID(ctx, applicationID); handleNotFound(c, err, "Application not found", "Failed to fetch application") {
			return
		}

		now := utils.Now()
		if err := q.RejectApplication(ctx, sqlc.RejectApplicationParams{
			ReviewNote: sql.NullString{String: req.ReviewNote, Valid: true},
			ReviewedAt: sql.NullTime{Time: now, Valid: true},
			ID:         applicationID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to reject application")
			return
		}
		utils.Success(c, nil)
	}
}

// ResendVendorActivationByApplication godoc
// @Summary Resend vendor activation email
// @Description Admin resends the vendor password activation link for an approved application
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param applicationID path string true "Application ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/vendor-applications/{applicationID}/resend-activation [post]
func ResendVendorActivationByApplication(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationID, ok := parsePathID(c, "applicationID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		app, err := q.GetApplicationByID(ctx, applicationID)
		if handleNotFound(c, err, "Application not found", "Failed to fetch application") {
			return
		}
		if app.Status != sqlc.VendorApplicationsStatusApproved {
			utils.Error(c, http.StatusConflict, "Activation link can only be resent for approved applications")
			return
		}

		vendor, err := q.GetVendorByBusinessEmail(ctx, app.BusinessEmail)
		if handleNotFound(c, err, "Vendor store not found for this application", "Failed to fetch vendor") {
			return
		}

		vendorUser, err := q.GetUserByID(ctx, vendor.UserID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load vendor account")
			return
		}
		if vendorAccountActivated(ctx, q, vendorUser) {
			utils.Error(c, http.StatusConflict, "Vendor account is already activated")
			return
		}

		applicantEmail := normalizeEmail(app.BusinessEmail)
		if app.UserID != nil && !app.UserID.IsZero() {
			applicant, err := q.GetUserByID(ctx, *app.UserID)
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to load applicant account")
				return
			}
			applicantEmail = applicant.Email
		}

		activation, err := sendVendorActivationEmail(ctx, cfg, q, vendor.UserID, vendor.BusinessEmail, vendor.StoreName, applicantEmail)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create activation link")
			return
		}

		utils.Success(c, vendorActivationResponse(
			cfg,
			activation,
			"Activation email resent to the business email address.",
			"SMTP is not configured — see server logs for the activation link.",
		))
	}
}

// ResendVendorActivationByVendor godoc
// @Summary Resend vendor activation email
// @Description Admin resends the vendor password activation link for an active vendor store
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param vendorID path string true "Vendor ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/vendors/{vendorID}/resend-activation [post]
func ResendVendorActivationByVendor(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := parsePathID(c, "vendorID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		vendor, err := q.GetVendorByIDAdmin(ctx, vendorID)
		if handleNotFound(c, err, "Vendor not found", "Failed to fetch vendor") {
			return
		}

		vendorUser, err := q.GetUserByID(ctx, vendor.UserID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load vendor account")
			return
		}
		if vendorAccountActivated(ctx, q, vendorUser) {
			utils.Error(c, http.StatusConflict, "Vendor account is already activated")
			return
		}

		applicantEmail, err := applicantEmailForVendor(ctx, q, vendor.BusinessEmail)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load applicant account")
			return
		}
		if applicantEmail == "" {
			applicantEmail = "your customer account"
		}

		activation, err := sendVendorActivationEmail(ctx, cfg, q, vendor.UserID, vendor.BusinessEmail, vendor.StoreName, applicantEmail)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create activation link")
			return
		}

		utils.Success(c, vendorActivationResponse(
			cfg,
			activation,
			"Activation email resent to "+vendor.BusinessEmail+".",
			"SMTP is not configured — see server logs for the activation link.",
		))
	}
}

// GetAdminFeaturedListings godoc
// @Summary List featured vendors and products
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 10, max 50)"
// @Success 200 {object} models.AdminFeaturedListingResponse
// @Router /admin/featured-listings [get]
func GetAdminFeaturedListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)
		if limit > 50 {
			limit = 50
		}

		vendorTotal, err := q.CountFeaturedVendorsAdmin(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured vendors")
			return
		}
		productTotal, err := q.CountFeaturedProductsAdmin(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured products")
			return
		}

		vendorRows, err := q.ListFeaturedVendorsAdmin(ctx, sqlc.ListFeaturedVendorsAdminParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured vendors")
			return
		}
		productRows, err := q.ListFeaturedProductsAdmin(ctx, sqlc.ListFeaturedProductsAdminParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured products")
			return
		}

		products := make([]models.AdminFeaturedProductRow, 0, len(productRows))
		for _, row := range productRows {
			vendorName := ""
			vendorLogo := ""
			if vendor, verr := q.GetVendorByID(ctx, row.VendorID); verr == nil {
				vendorName = vendor.StoreName
				vendorLogo = vendor.Logo
			}
			products = append(products, models.AdminFeaturedProductRow{
				Product:    store.ToProduct(row),
				VendorName: vendorName,
				VendorLogo: vendorLogo,
			})
		}

		utils.Success(c, models.AdminFeaturedListingResponse{
			Vendors:       store.ToVendors(vendorRows),
			Products:      products,
			TotalVendors:  vendorTotal,
			TotalProducts: productTotal,
			Page:          page,
			Limit:         limit,
		})
	}
}

// SetAdminProductFeatured godoc
// @Summary Enable or disable product featured status
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Param featured body models.AdminSetProductFeaturedRequest true "Featured status"
// @Success 200 {object} models.Product
// @Router /admin/products/{productID}/featured [put]
func SetAdminProductFeatured() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		var req models.AdminSetProductFeaturedRequest
		if !bindJSON(c, &req) {
			return
		}
		if req.Featured == nil {
			utils.Error(c, http.StatusBadRequest, "Featured flag is required")
			return
		}
		featured := *req.Featured

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetProductByIDAny(ctx, productID); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		// Admin can feature/unfeature any product regardless of vendor plan or status.
		if err := q.SetProductFeatured(ctx, sqlc.SetProductFeaturedParams{
			Featured: int16Bool(featured),
			ID:       productID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update featured product")
			return
		}
		updated, err := q.GetProductByIDAny(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		invalidateCatalogCache(c)
		utils.Success(c, store.ToProduct(updated))
	}
}

func nullStringToPtr(s sql.NullString) *string {
	if !s.Valid {
		return nil
	}
	v := s.String
	return &v
}

// FeatureVendor godoc
// @Summary Set vendor featured status
// @Description Admin marks/unmarks a vendor as featured
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param vendorID path string true "Vendor ID"
// @Param featured body models.SetVendorFeaturedRequest true "Featured status"
// @Success 200 {object} map[string]interface{}
// @Router /admin/vendors/{vendorID}/featured [post]
func FeatureVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := parsePathID(c, "vendorID")
		if !ok {
			return
		}
		var req models.SetVendorFeaturedRequest
		if !bindJSON(c, &req) {
			return
		}
		if req.Featured == nil {
			utils.Error(c, http.StatusBadRequest, "Featured flag is required")
			return
		}
		featured := *req.Featured

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetVendorByID(ctx, vendorID); handleNotFound(c, err, "Vendor not found", "Failed to fetch vendor") {
			return
		}
		if err := q.FeatureVendor(ctx, sqlc.FeatureVendorParams{
			IsFeatured: int16Bool(featured),
			ID:         vendorID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update vendor featured status")
			return
		}
		utils.Success(c, gin.H{"featured": featured})
	}
}

// ListAdminVendors godoc
// @Summary List all vendors
// @Description Admin lists all vendor stores with pagination
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number (default 1)"
// @Param limit query int false "Items per page (default 20, max 100)"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Vendor}
// @Router /admin/vendors [get]
func ListAdminVendors() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 20)
		if limit > 100 {
			limit = 100
		}

		total, err := q.CountVendorsAdmin(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch vendors")
			return
		}
		rows, err := q.ListVendorsAdmin(ctx, sqlc.ListVendorsAdminParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch vendors")
			return
		}
		vendors := store.ToVendors(rows)
		for i := range vendors {
			userID, err := utils.ParseID(vendors[i].UserID)
			if err != nil {
				continue
			}
			user, err := q.GetUserByID(ctx, userID)
			if err == nil {
				vendors[i].ActivationPending = !vendorAccountActivated(ctx, q, user)
				vendors[i].AccountDisabled = user.Disabled != 0
			}
		}
		respondPaginated(c, vendors, total, page, limit)
	}
}

// AdminPlatformSettings is the commerce and catalog configuration exposed to admins.
type AdminPlatformSettings struct {
	Filters           FilterOptions                            `json:"filters"`
	ShippingCost      float64                                  `json:"shippingCost"`
	TaxRate           float64                                  `json:"taxRate"`
	Currency          string                                   `json:"currency"`
	CommissionRate    float64                                  `json:"commissionRate"`
	CommissionEnabled bool                                     `json:"commissionEnabled"`
	SubscriptionPlans map[string]models.SubscriptionPlanConfig `json:"subscriptionPlans"`
}

// GetAdminPlatformSettings godoc
// @Summary Get platform settings
// @Description Returns catalog filters, checkout commerce defaults, and subscription plan definitions
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} handlers.AdminPlatformSettings
// @Router /admin/platform-settings [get]
func GetAdminPlatformSettings() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		cfg := c.MustGet("config").(*config.Config)
		q := getStore(c).Queries()
		planList, err := plans.ListFromPaystack(cfg)
		if err != nil {
			utils.Error(c, http.StatusBadGateway, "Failed to load subscription plans from Paystack")
			return
		}
		commissionRate := 10.0
		commissionEnabled := true
		if avg, err := q.GetAverageCommissionRate(ctx); err == nil {
			commissionRate = store.ToFloat(avg)
		}
		utils.Success(c, AdminPlatformSettings{
			Filters:           getFilterOptions(ctx, q),
			ShippingCost:      defaultShippingCost,
			TaxRate:           defaultTaxRate,
			Currency:          "KES",
			CommissionRate:    commissionRate,
			CommissionEnabled: commissionEnabled,
			SubscriptionPlans: planList,
		})
	}
}

// UpdateAdminPlatformSettings godoc
// @Summary Update platform commission settings
// @Description Admin adjusts platform revenue share percentage or deactivates commission on vendor sales
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param settings body models.UpdatePlatformCommissionRequest true "Commission settings"
// @Success 200 {object} handlers.AdminPlatformSettings
// @Router /admin/platform-settings [put]
func UpdateAdminPlatformSettings() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpdatePlatformCommissionRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.UpdateAllVendorCommissionRates(ctx, store.FloatToDecimalString(req.CommissionRate)); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update platform settings")
			return
		}
		GetAdminPlatformSettings()(c)
	}
}
