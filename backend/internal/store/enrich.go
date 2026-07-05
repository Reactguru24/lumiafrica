package store

import (
	"context"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
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
	if o.DeliveryZoneName.Valid && strings.TrimSpace(o.DeliveryZoneName.String) != "" {
		order.DeliveryZoneName = strings.TrimSpace(o.DeliveryZoneName.String)
	} else if zoneID, ok := orderBinaryFK(o.DeliveryZoneID); ok {
		if zone, err := q.GetDeliveryZoneByID(ctx, zoneID); err == nil {
			order.DeliveryZoneID = zone.ID.String()
			order.DeliveryZoneName = zone.Name
		}
	}
	return order
}

func LoadOrderForVendor(ctx context.Context, q *sqlc.Queries, o sqlc.Order, vendorID types.BinaryUUID) models.Order {
	allItems, _ := q.ListOrderItemsByOrder(ctx, o.ID)
	vendorItems := make([]sqlc.OrderItem, 0, len(allItems))
	for _, item := range allItems {
		if item.VendorID == vendorID {
			vendorItems = append(vendorItems, item)
		}
	}
	order := LoadOrder(ctx, q, o)
	order.Items = make([]models.OrderItem, len(vendorItems))
	for i, item := range vendorItems {
		order.Items[i] = sqlcOrderItemToModel(item)
	}

	settlements, _ := q.ListOrderVendorSettlementsByOrder(ctx, o.ID)
	order.IsMultiVendor = len(settlements) > 1

	settlement, err := q.GetOrderVendorSettlement(ctx, o.ID, vendorID)
	if err == nil {
		order.Status = models.OrderStatus(settlement.Status)
		order.Subtotal = parseDecimal(settlement.ProductSubtotal)
		order.ShippingCost = parseDecimal(settlement.ShippingFee)
		order.Total = parseDecimal(settlement.VendorEarnings)
		order.VendorProductTotal = order.Subtotal
		order.VendorShippingFee = order.ShippingCost
		order.VendorEarnings = order.Total
	}

	if shipment, err := q.GetShipmentByOrderAndVendor(ctx, o.ID, vendorID); err == nil {
		order.VendorShipmentID = shipment.ID.String()
	}

	return order
}

func LoadOrdersForVendor(ctx context.Context, q *sqlc.Queries, orders []sqlc.Order, vendorID types.BinaryUUID) []models.Order {
	out := make([]models.Order, len(orders))
	for i, o := range orders {
		out[i] = LoadOrderForVendor(ctx, q, o, vendorID)
	}
	return out
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
