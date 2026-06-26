package store

import (
	"context"
	"strings"

	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/models"
)

func LoadProduct(ctx context.Context, q *sqlc.Queries, p sqlc.Product) models.Product {
	variants, _ := q.ListProductVariants(ctx, p.ID)
	images, _ := q.ListProductImages(ctx, p.ID)
	category, subcategory := categorySlugs(ctx, q, p.CategoryID)
	return ToProductDetails(p, variants, images, category, subcategory)
}

func LoadProducts(ctx context.Context, q *sqlc.Queries, products []sqlc.Product) []models.Product {
	out := make([]models.Product, len(products))
	for i, p := range products {
		out[i] = LoadProduct(ctx, q, p)
	}
	return out
}

func LoadOrder(ctx context.Context, q *sqlc.Queries, o sqlc.Order) models.Order {
	items, _ := q.ListOrderItemsByOrder(ctx, o.ID)
	order := ToOrderWithItems(o, items)

	if couponID, ok := orderBinaryFK(o.CouponID); ok {
		if coupon, err := q.GetCouponByID(ctx, couponID); err == nil {
			order.CouponCode = coupon.Code
		}
	}
	if zoneID, ok := orderBinaryFK(o.DeliveryZoneID); ok {
		if zone, err := q.GetDeliveryZoneByID(ctx, zoneID); err == nil {
			order.DeliveryZoneID = zone.ID.String()
			order.DeliveryZoneName = zone.Name
		}
	}
	return order
}

func orderBinaryFK(id *types.BinaryUUID) (types.BinaryUUID, bool) {
	if id == nil || id.IsZero() {
		return types.BinaryUUID{}, false
	}
	return *id, true
}

func LoadOrders(ctx context.Context, q *sqlc.Queries, orders []sqlc.Order) []models.Order {
	out := make([]models.Order, len(orders))
	for i, o := range orders {
		out[i] = LoadOrder(ctx, q, o)
	}
	return out
}

func categorySlugs(ctx context.Context, q *sqlc.Queries, categoryID types.BinaryUUID) (string, string) {
	cat, err := q.GetCategoryByID(ctx, categoryID)
	if err != nil {
		return "", ""
	}
	if cat.ParentID == nil || cat.ParentID.IsZero() {
		return cat.Slug, ""
	}
	parent, err := q.GetCategoryByID(ctx, *cat.ParentID)
	if err != nil {
		return "", cat.Slug
	}
	subslug := cat.Slug
	if prefix := parent.Slug + "-"; strings.HasPrefix(subslug, prefix) {
		subslug = strings.TrimPrefix(subslug, prefix)
	}
	return parent.Slug, subslug
}
