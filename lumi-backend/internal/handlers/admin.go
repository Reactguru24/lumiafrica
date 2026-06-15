package handlers

import (
	"database/sql"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ListUsers godoc
// @Summary List all users
// @Description Admin lists all users in the system
// @Tags Admin
// @Produce json
// @Security Bearer
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
				ID: row.ID, FullName: row.FullName, Email: row.Email, Phone: row.Phone,
				Role: models.UserRole(row.Role), Avatar: nullStringToPtr(row.Avatar),
				Disabled: row.Disabled.Bool, CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
			}
		}
		respondPaginated(c, users, total, page, limit)
	}
}

// DisableUser godoc
// @Summary Disable a user
// @Description Admin disables a user account
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param userID path string true "User ID"
// @Success 200 {object} models.User
// @Router /admin/users/{userID}/disable [post]
func DisableUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetUserByID(ctx, userID)
		if handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}
		if err := q.DisableUser(ctx, userID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to disable user")
			return
		}
		user := store.ToUser(row)
		user.Sanitize()
		utils.Success(c, user)
	}
}

// ListAdminProducts godoc
// @Summary List all products for admin
// @Description Admin lists all non-archived products for moderation
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Product}
// @Router /admin/products [get]
func ListAdminProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 50)

		total, err := q.CountAdminProducts(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		rows, err := q.ListAdminProducts(ctx, sqlc.ListAdminProductsParams{Limit: int32(limit), Offset: int32(offset)})
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
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Product}
// @Router /admin/products/pending [get]
func ListPendingProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountPendingProducts(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		rows, err := q.ListPendingProducts(ctx, sqlc.ListPendingProductsParams{Limit: int32(limit), Offset: int32(offset)})
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
		productID := c.Param("productID")
		var req models.ModerateProductDecisionRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetProductByIDAny(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		status := sqlc.ProductsStatusArchived
		if req.Approved {
			status = sqlc.ProductsStatusActive
		}

		if err := q.ModerateProduct(ctx, sqlc.ModerateProductParams{
			Status: status, ID: productID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to moderate product")
			return
		}
		utils.Success(c, store.ToProduct(row))
	}
}

// ListVendorApplications godoc
// @Summary List vendor applications
// @Description Admin lists all pending vendor applications
// @Tags Admin
// @Produce json
// @Security Bearer
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
// @Success 200 {object} models.Vendor
// @Router /admin/vendor-applications/{applicationID}/approve [post]
func ApproveVendor() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationID := c.Param("applicationID")
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

		tx, err := st.DB().SQL.BeginTx(ctx, nil)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to start transaction")
			return
		}
		qtx := q.WithTx(tx)
		now := utils.Now()
		reviewNote := sql.NullString{String: derefString(req.ReviewNote), Valid: req.ReviewNote != nil}

		vendorID := utils.GenerateID()
		if err := qtx.CreateVendor(ctx, sqlc.CreateVendorParams{
			ID: vendorID, UserID: app.UserID, StoreName: app.StoreName,
			Slug:        utils.GenerateIDWithPrefix(app.StoreName),
			Description: sql.NullString{String: app.BusinessDescription, Valid: true},
			Logo:        app.Logo, Banner: sql.NullString{}, ContactPhone: app.ContactPhone,
			BusinessEmail: app.BusinessEmail, Country: app.Country, City: app.City,
			Categories: app.Categories,
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
		if err := qtx.UpdateUserRole(ctx, sqlc.UpdateUserRoleParams{Role: sqlc.UsersRoleVENDOR, ID: app.UserID}); err != nil {
			tx.Rollback()
			utils.Error(c, http.StatusInternalServerError, "Failed to update user role")
			return
		}
		if err := tx.Commit(); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to commit transaction")
			return
		}

		vendor, _ := q.GetVendorByID(ctx, vendorID)
		utils.Success(c, store.ToVendor(vendor))
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
		applicationID := c.Param("applicationID")
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
		vendorID := c.Param("vendorID")
		var req models.SetVendorFeaturedRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.FeatureVendor(ctx, sqlc.FeatureVendorParams{IsFeatured: sql.NullBool{Bool: req.Featured, Valid: true}, ID: vendorID}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update vendor featured status")
			return
		}
		utils.Success(c, nil)
	}
}
