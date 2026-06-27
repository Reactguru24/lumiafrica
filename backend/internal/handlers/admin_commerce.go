package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func setAdminActive(
	c *gin.Context,
	param, failMsg string,
	update func(ctx context.Context, id types.BinaryUUID, active int16) error,
) {
	id, ok := parsePathID(c, param)
	if !ok {
		return
	}
	var req models.SetActiveRequest
	if !bindJSON(c, &req) {
		return
	}
	active := int16(0)
	if req.Active {
		active = 1
	}
	if err := update(c.Request.Context(), id, active); err != nil {
		utils.Error(c, http.StatusInternalServerError, failMsg)
		return
	}
	utils.Success(c, gin.H{"active": req.Active})
}

// ListAdminCoupons godoc
// @Summary List coupons (admin)
// @Description Returns paginated coupon codes for platform management.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /admin/coupons [get]
func ListAdminCoupons() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 20)
		total, err := q.CountAllCoupons(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load coupons")
			return
		}
		rows, err := q.ListAllCoupons(ctx, sqlc.ListAllCouponsParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load coupons")
			return
		}
		out := make([]models.CouponResponse, len(rows))
		for i, row := range rows {
			out[i] = store.ToCoupon(row)
		}
		respondPaginated(c, out, total, page, limit)
	}
}

// CreateAdminCoupon godoc
// @Summary Create coupon (admin)
// @Description Create a new discount coupon.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param coupon body models.CreateCouponRequest true "Coupon details"
// @Success 201 {object} models.CouponResponse
// @Router /admin/coupons [post]
func CreateAdminCoupon() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateCouponRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		perUser := int32(req.PerUserLimit)
		if perUser < 1 {
			perUser = 1
		}
		params := sqlc.CreateCouponParams{
			ID:             utils.GenerateBinaryID(),
			Code:           strings.ToUpper(strings.TrimSpace(req.Code)),
			Type:           sqlc.CouponsType(req.Type),
			Value:          store.FloatToDecimalString(req.Value),
			MinOrderAmount: store.FloatToDecimalString(req.MinOrderAmount),
			PerUserLimit:   perUser,
		}
		if req.MaxDiscount != nil {
			params.MaxDiscount = sql.NullString{String: store.FloatToDecimalString(*req.MaxDiscount), Valid: true}
		}
		if req.MaxUses != nil {
			params.MaxUses = sql.NullInt32{Int32: int32(*req.MaxUses), Valid: true}
		}
		if req.StartsAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.StartsAt); err == nil {
				params.StartsAt = sql.NullTime{Time: t, Valid: true}
			}
		}
		if req.ExpiresAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.ExpiresAt); err == nil {
				params.ExpiresAt = sql.NullTime{Time: t, Valid: true}
			}
		}
		if err := q.CreateCoupon(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create coupon")
			return
		}
		coupon, err := q.GetCouponByCode(ctx, params.Code)
		if err != nil {
			utils.SuccessCreated(c, gin.H{"code": params.Code})
			return
		}
		utils.SuccessCreated(c, store.ToCoupon(coupon))
	}
}

// SetAdminCouponActive godoc
// @Summary Enable or disable coupon (admin)
// @Description Toggle whether a coupon is active.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param couponID path string true "Coupon ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/coupons/{couponID}/active [put]
func SetAdminCouponActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		setAdminActive(c, "couponID", "Failed to update coupon", func(ctx context.Context, id types.BinaryUUID, active int16) error {
			return getStore(c).Queries().SetCouponActive(ctx, sqlc.SetCouponActiveParams{ID: id, Active: active})
		})
	}
}

// DeleteAdminCoupon godoc
// @Summary Soft-delete coupon (admin)
// @Description Marks a coupon as deleted and removes it from admin lists and checkout validation.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param couponID path string true "Coupon ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/coupons/{couponID} [delete]
func DeleteAdminCoupon() gin.HandlerFunc {
	return func(c *gin.Context) {
		couponID, ok := parsePathID(c, "couponID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		if err := getStore(c).Queries().SoftDeleteCoupon(ctx, couponID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete coupon")
			return
		}
		utils.Success(c, gin.H{"id": couponID.String(), "deleted": true})
	}
}

// UpdateAdminCoupon godoc
// @Summary Update coupon (admin)
// @Description Update an existing discount coupon.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param couponID path string true "Coupon ID"
// @Param coupon body models.UpdateCouponRequest true "Coupon details"
// @Success 200 {object} models.CouponResponse
// @Router /admin/coupons/{couponID} [put]
func UpdateAdminCoupon() gin.HandlerFunc {
	return func(c *gin.Context) {
		couponID, ok := parsePathID(c, "couponID")
		if !ok {
			return
		}
		var req models.UpdateCouponRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetCouponByID(ctx, couponID); handleNotFound(c, err, "Coupon not found", "Failed to fetch coupon") {
			return
		}
		params, err := buildCouponWriteParams(req.Code, req.Type, req.Value, req.MinOrderAmount, req.MaxDiscount, req.MaxUses, req.PerUserLimit, req.StartsAt, req.ExpiresAt)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		params.ID = couponID
		if err := q.UpdateCoupon(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update coupon")
			return
		}
		updated, err := q.GetCouponByID(ctx, couponID)
		if handleNotFound(c, err, "Coupon not found", "Failed to fetch coupon") {
			return
		}
		utils.Success(c, store.ToCoupon(updated))
	}
}

func buildCouponWriteParams(
	code, couponType string,
	value, minOrderAmount float64,
	maxDiscount *float64,
	maxUses *int,
	perUserLimit int,
	startsAt, expiresAt *string,
) (sqlc.UpdateCouponParams, error) {
	perUser := int32(perUserLimit)
	if perUser < 1 {
		perUser = 1
	}
	params := sqlc.UpdateCouponParams{
		Code:           strings.ToUpper(strings.TrimSpace(code)),
		Type:           sqlc.CouponsType(couponType),
		Value:          store.FloatToDecimalString(value),
		MinOrderAmount: store.FloatToDecimalString(minOrderAmount),
		PerUserLimit:   perUser,
	}
	if maxDiscount != nil {
		params.MaxDiscount = sql.NullString{String: store.FloatToDecimalString(*maxDiscount), Valid: true}
	}
	if maxUses != nil {
		params.MaxUses = sql.NullInt32{Int32: int32(*maxUses), Valid: true}
	}
	if startsAt != nil && strings.TrimSpace(*startsAt) != "" {
		t, err := time.Parse(time.RFC3339, *startsAt)
		if err != nil {
			return params, err
		}
		params.StartsAt = sql.NullTime{Time: t, Valid: true}
	}
	if expiresAt != nil && strings.TrimSpace(*expiresAt) != "" {
		t, err := time.Parse(time.RFC3339, *expiresAt)
		if err != nil {
			return params, err
		}
		params.ExpiresAt = sql.NullTime{Time: t, Valid: true}
	}
	return params, nil
}

// ListAdminPromotions godoc
// @Summary List promotions (admin)
// @Description Returns all promotions including inactive and scheduled.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /admin/promotions [get]
func ListAdminPromotions() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 20)
		total, err := q.CountAllPromotions(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load promotions")
			return
		}
		rows, err := q.ListAllPromotions(ctx, sqlc.ListAllPromotionsParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load promotions")
			return
		}
		out := make([]models.PromotionResponse, 0, len(rows))
		for _, row := range rows {
			out = append(out, buildPromotionResponse(ctx, q, row))
		}
		respondPaginated(c, out, total, page, limit)
	}
}

// CreateAdminPromotion godoc
// @Summary Create promotion (admin)
// @Description Create a marketing promotion with linked products.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param promotion body models.CreatePromotionRequest true "Promotion details"
// @Success 201 {object} models.PromotionResponse
// @Router /admin/promotions [post]
func CreateAdminPromotion() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreatePromotionRequest
		if !bindJSON(c, &req) {
			return
		}
		startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid startsAt")
			return
		}
		endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid endsAt")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		adminID, _ := utils.ParseID(middleware.GetUserID(c))
		promoID := utils.GenerateBinaryID()
		var createdBy *types.BinaryUUID
		if !adminID.IsZero() {
			createdBy = &adminID
		}
		if err := q.CreatePromotion(ctx, sqlc.CreatePromotionParams{
			ID:            promoID,
			Name:          req.Name,
			Type:          sqlc.PromotionsType(req.Type),
			DiscountType:  sqlc.PromotionsDiscountTypePercentage,
			DiscountValue: store.FloatToDecimalString(0),
			StartsAt:      startsAt,
			EndsAt:        endsAt,
			CreatedBy:     createdBy,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create promotion")
			return
		}
		utils.SuccessCreated(c, gin.H{"id": promoID.String()})
	}
}

// ListAdminCollections godoc
// @Summary List collections (admin)
// @Description Returns all curated collections including inactive.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /admin/collections [get]
func ListAdminCollections() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 20)
		total, err := q.CountAllCollections(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load collections")
			return
		}
		rows, err := q.ListAllCollections(ctx, sqlc.ListAllCollectionsParams{Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load collections")
			return
		}
		out := make([]models.CollectionResponse, 0, len(rows))
		for _, row := range rows {
			ids, _ := q.ListCollectionProductIDs(ctx, row.ID)
			out = append(out, store.ToCollection(row, binaryIDsToStrings(ids), nil))
		}
		respondPaginated(c, out, total, page, limit)
	}
}

// CreateAdminCollection godoc
// @Summary Create collection (admin)
// @Description Create a curated product collection (e.g. staff-picks).
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param collection body models.CreateCollectionRequest true "Collection details"
// @Success 201 {object} map[string]interface{}
// @Router /admin/collections [post]
func CreateAdminCollection() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateCollectionRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		adminID, _ := utils.ParseID(middleware.GetUserID(c))
		collID := utils.GenerateBinaryID()
		var createdBy *types.BinaryUUID
		if !adminID.IsZero() {
			createdBy = &adminID
		}
		desc := sql.NullString{}
		if req.Description != "" {
			desc = sql.NullString{String: req.Description, Valid: true}
		}
		img := sql.NullString{}
		if req.Image != "" {
			img = sql.NullString{String: req.Image, Valid: true}
		}
		if err := q.CreateCollection(ctx, sqlc.CreateCollectionParams{
			ID:          collID,
			Name:        req.Name,
			Slug:        strings.ToLower(strings.TrimSpace(req.Slug)),
			Description: desc,
			Image:       img,
			SortOrder:   int32(req.SortOrder),
			StartsAt:    parseOptionalRFC3339(req.StartsAt),
			EndsAt:      parseOptionalRFC3339(req.EndsAt),
			CreatedBy:   createdBy,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create collection")
			return
		}
		for i, pid := range req.ProductIDs {
			productID, err := utils.ParseID(pid)
			if err != nil {
				continue
			}
			_ = q.AddCollectionProduct(ctx, sqlc.AddCollectionProductParams{
				CollectionID: collID, ProductID: productID, SortOrder: int32(i),
			})
		}
		utils.SuccessCreated(c, gin.H{"id": collID.String(), "slug": req.Slug})
	}
}

// UpdateAdminPromotion godoc
// @Summary Update promotion (admin)
// @Description Update promotion details and linked products.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param promotionID path string true "Promotion ID"
// @Param promotion body models.UpdatePromotionRequest true "Promotion updates"
// @Success 200 {object} models.PromotionResponse
// @Router /admin/promotions/{promotionID} [put]
func UpdateAdminPromotion() gin.HandlerFunc {
	return func(c *gin.Context) {
		promoID, ok := parsePathID(c, "promotionID")
		if !ok {
			return
		}
		var req models.UpdatePromotionRequest
		if !bindJSON(c, &req) {
			return
		}
		startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid startsAt")
			return
		}
		endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid endsAt")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.UpdatePromotion(ctx, sqlc.UpdatePromotionParams{
			ID:            promoID,
			Name:          req.Name,
			Type:          sqlc.PromotionsType(req.Type),
			DiscountType:  sqlc.PromotionsDiscountTypePercentage,
			DiscountValue: store.FloatToDecimalString(0),
			StartsAt:      startsAt,
			EndsAt:        endsAt,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update promotion")
			return
		}
		row, err := q.GetPromotionByID(ctx, promoID)
		if err != nil {
			utils.Success(c, gin.H{"id": promoID.String()})
			return
		}
		utils.Success(c, buildPromotionResponse(ctx, q, row))
	}
}

// SetAdminPromotionActive godoc
// @Summary Enable or disable promotion (admin)
// @Description Toggle whether a promotion is active.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param promotionID path string true "Promotion ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/promotions/{promotionID}/active [put]
func SetAdminPromotionActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		setAdminActive(c, "promotionID", "Failed to update promotion", func(ctx context.Context, id types.BinaryUUID, active int16) error {
			return getStore(c).Queries().SetPromotionActive(ctx, sqlc.SetPromotionActiveParams{ID: id, Active: active})
		})
	}
}

// DeleteAdminPromotion godoc
// @Summary Soft-delete promotion (admin)
// @Description Marks a promotion as deleted and removes it from admin and storefront lists.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param promotionID path string true "Promotion ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/promotions/{promotionID} [delete]
func DeleteAdminPromotion() gin.HandlerFunc {
	return func(c *gin.Context) {
		promoID, ok := parsePathID(c, "promotionID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		if err := getStore(c).Queries().SoftDeletePromotion(ctx, promoID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete promotion")
			return
		}
		utils.Success(c, gin.H{"id": promoID.String(), "deleted": true})
	}
}

// UpdateAdminCollection godoc
// @Summary Update collection (admin)
// @Description Update collection metadata and linked products.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param collectionID path string true "Collection ID"
// @Param collection body models.UpdateCollectionRequest true "Collection updates"
// @Success 200 {object} models.CollectionResponse
// @Router /admin/collections/{collectionID} [put]
func UpdateAdminCollection() gin.HandlerFunc {
	return func(c *gin.Context) {
		collID, ok := parsePathID(c, "collectionID")
		if !ok {
			return
		}
		var req models.UpdateCollectionRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		desc := sql.NullString{}
		if req.Description != "" {
			desc = sql.NullString{String: req.Description, Valid: true}
		}
		img := sql.NullString{}
		if req.Image != "" {
			img = sql.NullString{String: req.Image, Valid: true}
		}
		if err := q.UpdateCollection(ctx, sqlc.UpdateCollectionParams{
			ID:          collID,
			Name:        req.Name,
			Slug:        strings.ToLower(strings.TrimSpace(req.Slug)),
			Description: desc,
			Image:       img,
			SortOrder:   int32(req.SortOrder),
			StartsAt:    parseOptionalRFC3339(req.StartsAt),
			EndsAt:      parseOptionalRFC3339(req.EndsAt),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update collection")
			return
		}
		replaceCollectionProducts(ctx, q, collID, req.ProductIDs)
		row, err := q.GetCollectionByID(ctx, collID)
		if err != nil {
			utils.Success(c, gin.H{"id": collID.String()})
			return
		}
		ids, _ := q.ListCollectionProductIDs(ctx, collID)
		utils.Success(c, store.ToCollection(row, binaryIDsToStrings(ids), nil))
	}
}

// SetAdminCollectionActive godoc
// @Summary Enable or disable collection (admin)
// @Description Toggle whether a collection is active.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param collectionID path string true "Collection ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/collections/{collectionID}/active [put]
func SetAdminCollectionActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		setAdminActive(c, "collectionID", "Failed to update collection", func(ctx context.Context, id types.BinaryUUID, active int16) error {
			return getStore(c).Queries().SetCollectionActive(ctx, sqlc.SetCollectionActiveParams{ID: id, Active: active})
		})
	}
}

// DeleteAdminCollection godoc
// @Summary Soft-delete collection (admin)
// @Description Marks a curated collection as deleted and removes it from admin and storefront lists.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param collectionID path string true "Collection ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/collections/{collectionID} [delete]
func DeleteAdminCollection() gin.HandlerFunc {
	return func(c *gin.Context) {
		collID, ok := parsePathID(c, "collectionID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		if err := getStore(c).Queries().SoftDeleteCollection(ctx, collID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete collection")
			return
		}
		utils.Success(c, gin.H{"id": collID.String(), "deleted": true})
	}
}

func replacePromotionProducts(ctx context.Context, q *sqlc.Queries, promoID types.BinaryUUID, productIDs []string) {
	_ = q.DeletePromotionProducts(ctx, promoID)
	for _, pid := range productIDs {
		productID, err := utils.ParseID(pid)
		if err != nil {
			continue
		}
		_ = q.AddPromotionProduct(ctx, sqlc.AddPromotionProductParams{
			PromotionID: promoID, ProductID: productID,
		})
	}
}

func replaceCollectionProducts(ctx context.Context, q *sqlc.Queries, collID types.BinaryUUID, productIDs []string) {
	_ = q.DeleteCollectionProducts(ctx, collID)
	for i, pid := range productIDs {
		productID, err := utils.ParseID(pid)
		if err != nil {
			continue
		}
		_ = q.AddCollectionProduct(ctx, sqlc.AddCollectionProductParams{
			CollectionID: collID, ProductID: productID, SortOrder: int32(i),
		})
	}
}

func parseOptionalRFC3339(value *string) sql.NullTime {
	if value == nil || strings.TrimSpace(*value) == "" {
		return sql.NullTime{}
	}
	t, err := time.Parse(time.RFC3339, strings.TrimSpace(*value))
	if err != nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: t, Valid: true}
}
