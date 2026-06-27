package commerce

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
)

type VendorShippingLine struct {
	VendorID     string  `json:"vendorId"`
	StoreName    string  `json:"storeName"`
	Subtotal     float64 `json:"subtotal"`
	ShippingCost float64 `json:"shippingCost"`
}

type variantLineKey struct {
	productID types.BinaryUUID
	size      string
	color     string
}

func ResolveVendorShipping(ctx context.Context, q *sqlc.Queries, items []models.OrderItem, deliveryZoneID string) (float64, []VendorShippingLine, error) {
	if len(items) == 0 {
		return 0, nil, fmt.Errorf("cart is empty")
	}
	zoneID, err := utils.ParseID(strings.TrimSpace(deliveryZoneID))
	if err != nil {
		return 0, nil, fmt.Errorf("delivery zone is required")
	}
	if _, err := q.GetDeliveryZoneByID(ctx, zoneID); err != nil {
		return 0, nil, fmt.Errorf("delivery zone not found")
	}

	productCache := make(map[types.BinaryUUID]sqlc.Product)
	variantCache := make(map[variantLineKey]sqlc.ProductVariant)
	vendorSubtotals := make(map[types.BinaryUUID]float64)

	for _, item := range items {
		if item.Color == "" {
			return 0, nil, fmt.Errorf("color is required for every item")
		}
		productID, err := utils.ParseID(item.ProductID)
		if err != nil {
			return 0, nil, fmt.Errorf("invalid product id")
		}

		product, ok := productCache[productID]
		if !ok {
			row, err := q.GetProductByID(ctx, productID)
			if err != nil {
				return 0, nil, fmt.Errorf("product not found or unavailable")
			}
			product = row
			productCache[productID] = product
		}

		key := variantLineKey{productID: productID, size: item.Size, color: item.Color}
		variant, ok := variantCache[key]
		if !ok {
			row, err := q.GetProductVariantByProductSizeColor(ctx, sqlc.GetProductVariantByProductSizeColorParams{
				ProductID: productID, Size: item.Size, Color: item.Color,
			})
			if err != nil {
				return 0, nil, fmt.Errorf("%s / %s is not available", item.Size, item.Color)
			}
			variant = row
			variantCache[key] = variant
		}

		price := store.ParseDecimalString(variant.Price)
		if discount := store.ParseDecimalString(variant.Discount); discount > 0 {
			price = price * (1 - discount/100)
		}
		vendorSubtotals[product.VendorID] += price * float64(item.Quantity)
	}

	lines := make([]VendorShippingLine, 0, len(vendorSubtotals))
	var totalShipping float64

	for vendorID, subtotal := range vendorSubtotals {
		vendor, err := q.GetVendorByID(ctx, vendorID)
		if err != nil {
			vendor, err = q.GetVendorByIDAdmin(ctx, vendorID)
			if err != nil {
				return 0, nil, fmt.Errorf("vendor not found")
			}
		}

		cost, err := vendorShippingFeeForZone(ctx, q, vendor, zoneID, subtotal)
		if err != nil {
			return 0, nil, err
		}
		totalShipping += cost
		lines = append(lines, VendorShippingLine{
			VendorID:     vendorID.String(),
			StoreName:    vendor.StoreName,
			Subtotal:     subtotal,
			ShippingCost: cost,
		})
	}

	return totalShipping, lines, nil
}

func vendorShippingFeeForZone(ctx context.Context, q *sqlc.Queries, vendor sqlc.Vendor, zoneID types.BinaryUUID, vendorSubtotal float64) (float64, error) {
	if vendor.FreeShippingThreshold.Valid {
		threshold := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
		if threshold > 0 && vendorSubtotal >= threshold {
			return 0, nil
		}
	}

	rate, err := q.GetVendorShippingRate(ctx, vendor.ID, zoneID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return store.ParseDecimalString(vendor.ShippingCost), nil
		}
		return 0, err
	}
	return store.ParseDecimalString(rate.Fee), nil
}
