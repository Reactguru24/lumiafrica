package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/commerce"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func primaryProductImage(ctx context.Context, q *sqlc.Queries, productID types.BinaryUUID) string {
	images, err := q.ListProductImages(ctx, productID)
	if err != nil || len(images) == 0 {
		return ""
	}
	for _, img := range images {
		if img.IsPrimary != 0 {
			return img.Url
		}
	}
	return images[0].Url
}

func promotionCoverImage(ctx context.Context, q *sqlc.Queries, productIDs []types.BinaryUUID) string {
	for _, id := range productIDs {
		if url := primaryProductImage(ctx, q, id); url != "" {
			return url
		}
	}
	return ""
}

func promotionOnSaleProductIDs(ctx context.Context, q *sqlc.Queries) ([]types.BinaryUUID, error) {
	// Only products with an in-stock variant that has a vendor discount qualify.
	return q.ListOnSaleProductIDs(ctx)
}

func buildPromotionResponse(ctx context.Context, q *sqlc.Queries, row sqlc.Promotion) models.PromotionResponse {
	ids, err := promotionOnSaleProductIDs(ctx, q)
	if err != nil || len(ids) == 0 {
		return store.ToPromotion(row, nil, "")
	}
	pidStrs := binaryIDsToStrings(ids)
	return store.ToPromotion(row, pidStrs, promotionCoverImage(ctx, q, ids))
}

// ListDeliveryZones godoc
// @Summary List active delivery zones
// @Description Returns delivery zones available for checkout.
// @Tags Guest
// @Produce json
// @Success 200 {array} models.DeliveryZoneResponse
// @Router /delivery-zones [get]
func ListDeliveryZones() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListActiveDeliveryZones(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load delivery zones")
			return
		}
		out := make([]models.DeliveryZoneResponse, len(rows))
		for i, row := range rows {
			out[i] = store.ToDeliveryZone(row)
		}
		utils.Success(c, out)
	}
}

// ListActivePromotions godoc
// @Summary List active promotions
// @Description Returns promotions that are currently active and within their date window.
// @Tags Guest
// @Produce json
// @Success 200 {array} models.PromotionResponse
// @Router /promotions [get]
func ListActivePromotions() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		rows, err := q.ListActivePromotions(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load promotions")
			return
		}
		out := make([]models.PromotionResponse, 0, len(rows))
		for _, row := range rows {
			resp := buildPromotionResponse(ctx, q, row)
			if len(resp.ProductIDs) == 0 {
				continue
			}
			out = append(out, resp)
		}
		utils.Success(c, out)
	}
}

// ListCollections godoc
// @Summary List active collections
// @Description Returns curated product collections (e.g. staff-picks) with product IDs.
// @Tags Guest
// @Produce json
// @Success 200 {array} models.CollectionResponse
// @Router /collections [get]
func ListCollections() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		rows, err := q.ListActiveCollections(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load collections")
			return
		}
		out := make([]models.CollectionResponse, 0, len(rows))
		for _, row := range rows {
			ids, _ := q.ListCollectionProductIDs(ctx, row.ID)
			out = append(out, store.ToCollection(row, binaryIDsToStrings(ids), nil))
		}
		utils.Success(c, out)
	}
}

// GetCollection godoc
// @Summary Get collection by slug
// @Description Returns a collection with its products resolved.
// @Tags Guest
// @Produce json
// @Param slug path string true "Collection slug"
// @Success 200 {object} models.CollectionResponse
// @Router /collections/{slug} [get]
func GetCollection() gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := strings.TrimSpace(c.Param("slug"))
		if slug == "" {
			utils.Error(c, http.StatusBadRequest, "Invalid collection")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetCollectionBySlug(ctx, slug)
		if handleNotFound(c, err, "Collection not found", "Failed to load collection") {
			return
		}
		ids, _ := q.ListCollectionProductIDs(ctx, row.ID)
		products := loadProductsByIDs(ctx, q, ids)
		utils.Success(c, store.ToCollection(row, binaryIDsToStrings(ids), products))
	}
}

// EstimateShipping godoc
// @Summary Estimate order shipping
// @Description Calculates shipping from each vendor's configured rates for the given cart items.
// @Tags Guest
// @Accept json
// @Produce json
// @Param estimate body models.ShippingEstimateRequest true "Cart items"
// @Success 200 {object} models.ShippingEstimateResponse
// @Router /commerce/shipping-estimate [post]
func EstimateShipping() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ShippingEstimateRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		total, lines, err := commerce.ResolveVendorShipping(ctx, getStore(c).Queries(), req.Items, req.DeliveryZoneID)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		breakdown := make([]models.VendorShippingBreakdown, len(lines))
		for i, line := range lines {
			breakdown[i] = models.VendorShippingBreakdown{
				VendorID:     line.VendorID,
				StoreName:    line.StoreName,
				Subtotal:     line.Subtotal,
				ShippingCost: line.ShippingCost,
			}
		}
		utils.Success(c, models.ShippingEstimateResponse{
			ShippingCost:   total,
			Breakdown:      breakdown,
			DeliveryZoneID: req.DeliveryZoneID,
		})
	}
}

// ValidateCoupon godoc
// @Summary Validate a coupon code
// @Description Checks whether a coupon is valid for the given subtotal and returns the discount amount.
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param coupon body models.ValidateCouponRequest true "Coupon validation"
// @Success 200 {object} models.ValidateCouponResponse
// @Router /coupons/validate [post]
func ValidateCoupon() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		var req models.ValidateCouponRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		coupon, discount, err := commerce.ValidateCoupon(ctx, getStore(c).Queries(), req.Code, userID, req.Subtotal)
		if err != nil {
			utils.Success(c, models.ValidateCouponResponse{
				Valid:   false,
				Message: commerce.CouponErrorMessage(err),
			})
			return
		}
		utils.Success(c, models.ValidateCouponResponse{
			Valid:          true,
			Code:           coupon.Code,
			DiscountAmount: discount,
		})
	}
}

func binaryIDsToStrings(ids []types.BinaryUUID) []string {
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}

func loadProductsByIDs(ctx context.Context, q *sqlc.Queries, ids []types.BinaryUUID) []models.Product {
	if len(ids) == 0 {
		return []models.Product{}
	}
	out := make([]models.Product, 0, len(ids))
	for _, id := range ids {
		row, err := q.GetProductByID(ctx, id)
		if err != nil {
			continue
		}
		out = append(out, store.LoadProduct(ctx, q, row))
	}
	return out
}
