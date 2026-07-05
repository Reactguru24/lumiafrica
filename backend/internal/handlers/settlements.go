package handlers

import (
	"context"
	"database/sql"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
)

func createOrderItems(ctx context.Context, q *sqlc.Queries, orderID types.BinaryUUID, items []models.OrderItem) error {
	for _, item := range items {
		productID, err := utils.ParseID(item.ProductID)
		if err != nil {
			return err
		}
		variant, err := q.GetProductVariantByProductSizeColor(ctx, sqlc.GetProductVariantByProductSizeColorParams{
			ProductID: productID, Size: item.Size, Color: item.Color,
		})
		if err != nil {
			return err
		}
		product, err := q.GetProductByID(ctx, productID)
		if err != nil {
			return err
		}
		vendorID := product.VendorID
		if item.VendorID != "" {
			if parsed, perr := utils.ParseID(item.VendorID); perr == nil {
				vendorID = parsed
			}
		}

		unitPrice := store.ParseDecimalString(variant.Price)
		discountPct := store.ParseDecimalString(variant.Discount)
		if discountPct > 0 {
			unitPrice = unitPrice * (1 - discountPct/100)
		}
		lineSubtotal := unitPrice * float64(item.Quantity)

		commissionRate := 10.0
		if rate, err := q.GetVendorCommissionRate(ctx, vendorID); err == nil {
			commissionRate = store.ParseDecimalString(rate)
		}
		platformFee := lineSubtotal * (commissionRate / 100)
		vendorEarnings := lineSubtotal - platformFee

		imageURL := sql.NullString{}
		images, _ := q.ListProductImages(ctx, productID)
		if len(images) > 0 {
			imageURL = sql.NullString{String: images[0].Url, Valid: true}
		}

		if err := q.CreateOrderItem(ctx, sqlc.CreateOrderItemParams{
			ID:             utils.GenerateBinaryID(),
			OrderID:          orderID,
			ProductID:        productID,
			VariantID:        variant.ID,
			VendorID:         vendorID,
			ProductName:      product.Name,
			Sku:              product.Sku,
			Size:             item.Size,
			Color:            item.Color,
			ImageUrl:         imageURL,
			UnitPrice:        store.FloatToDecimalString(unitPrice),
			Discount:         store.FloatToDecimalString(discountPct),
			Quantity:         int32(item.Quantity),
			Subtotal:         store.FloatToDecimalString(lineSubtotal),
			VendorEarnings:   store.FloatToDecimalString(vendorEarnings),
			PlatformFee:      store.FloatToDecimalString(platformFee),
		}); err != nil {
			return err
		}
	}
	return nil
}

func recordOrderSettlements(ctx context.Context, q *sqlc.Queries, orderID string, items []models.OrderItem) error {
	parsedOrderID, err := utils.ParseID(orderID)
	if err != nil {
		return err
	}
	return createOrderItems(ctx, q, parsedOrderID, items)
}

func recordVendorOrderSettlements(
	ctx context.Context,
	q *sqlc.Queries,
	orderID types.BinaryUUID,
	shipments []models.VendorShipmentMeta,
) error {
	items, err := q.ListOrderItemsByOrder(ctx, orderID)
	if err != nil {
		return err
	}

	type vendorAgg struct {
		productSubtotal float64
		platformFee     float64
		vendorEarnings  float64
	}
	byVendor := make(map[types.BinaryUUID]vendorAgg)
	for _, item := range items {
		sub := store.ParseDecimalString(item.Subtotal)
		fee := store.ParseDecimalString(item.PlatformFee)
		earn := store.ParseDecimalString(item.VendorEarnings)
		agg := byVendor[item.VendorID]
		agg.productSubtotal += sub
		agg.platformFee += fee
		agg.vendorEarnings += earn
		byVendor[item.VendorID] = agg
	}

	shippingByVendor := make(map[types.BinaryUUID]float64)
	for _, line := range shipments {
		vid, err := utils.ParseID(line.VendorID)
		if err != nil {
			continue
		}
		shippingByVendor[vid] += line.ShippingFee
	}

	for vendorID, agg := range byVendor {
		shipping := shippingByVendor[vendorID]
		totalEarnings := agg.vendorEarnings + shipping
		if err := q.CreateOrderVendorSettlement(ctx, sqlc.CreateOrderVendorSettlementParams{
			ID:              utils.GenerateBinaryID(),
			OrderID:         orderID,
			VendorID:        vendorID,
			ProductSubtotal: store.FloatToDecimalString(agg.productSubtotal),
			ShippingFee:     store.FloatToDecimalString(shipping),
			PlatformFee:     store.FloatToDecimalString(agg.platformFee),
			VendorEarnings:  store.FloatToDecimalString(totalEarnings),
			Status:          string(models.OrderStatusProcessing),
		}); err != nil {
			return err
		}
	}
	return nil
}
