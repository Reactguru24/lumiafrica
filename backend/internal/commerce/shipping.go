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
	VendorID      string   `json:"vendorId"`
	StoreName     string   `json:"storeName"`
	Subtotal      float64  `json:"subtotal"`
	ShippingCost  float64  `json:"shippingCost"`
	ZoneName      string   `json:"zoneName"`
	EstimatedDays string   `json:"estimatedDays"`
	ZoneMatched   bool     `json:"zoneMatched"`
	ProductIDs    []string `json:"productIds"`
}

type zoneFeeResult struct {
	fee           float64
	zoneName      string
	estimatedDays string
	zoneMatched   bool
}

type variantLineKey struct {
	productID types.BinaryUUID
	size      string
	color     string
}

func ResolveVendorShipping(ctx context.Context, q *sqlc.Queries, items []models.OrderItem, deliveryZoneKey string) (float64, []VendorShippingLine, error) {
	if len(items) == 0 {
		return 0, nil, fmt.Errorf("cart is empty")
	}
	zoneKey := strings.TrimSpace(deliveryZoneKey)
	if zoneKey == "" {
		return 0, nil, fmt.Errorf("delivery zone is required")
	}

	productCache := make(map[types.BinaryUUID]sqlc.Product)
	variantCache := make(map[variantLineKey]sqlc.ProductVariant)
	vendorSubtotals := make(map[types.BinaryUUID]float64)
	vendorProducts := make(map[types.BinaryUUID]map[string]struct{})

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
		if vendorProducts[product.VendorID] == nil {
			vendorProducts[product.VendorID] = make(map[string]struct{})
		}
		vendorProducts[product.VendorID][item.ProductID] = struct{}{}
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

		result, err := vendorShippingFeeForZoneKey(ctx, q, vendor, zoneKey, subtotal)
		if err != nil {
			return 0, nil, err
		}
		totalShipping += result.fee
		productIDs := make([]string, 0, len(vendorProducts[vendorID]))
		for pid := range vendorProducts[vendorID] {
			productIDs = append(productIDs, pid)
		}
		lines = append(lines, VendorShippingLine{
			VendorID:      vendorID.String(),
			StoreName:     vendor.StoreName,
			Subtotal:      subtotal,
			ShippingCost:  result.fee,
			ZoneName:      result.zoneName,
			EstimatedDays: result.estimatedDays,
			ZoneMatched:   result.zoneMatched,
			ProductIDs:    productIDs,
		})
	}

	return totalShipping, lines, nil
}

func vendorShippingFeeForZoneKey(ctx context.Context, q *sqlc.Queries, vendor sqlc.Vendor, zoneKey string, vendorSubtotal float64) (zoneFeeResult, error) {
	if vendor.FreeShippingThreshold.Valid {
		threshold := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
		if threshold > 0 && vendorSubtotal >= threshold {
			return zoneFeeResult{
				fee:           0,
				zoneName:      zoneKey,
				estimatedDays: "Free shipping",
				zoneMatched:   true,
			}, nil
		}
	}

	zoneKey = strings.TrimSpace(zoneKey)
	if zoneKey == "" {
		return zoneFeeResult{
			fee:           store.ParseDecimalString(vendor.ShippingCost),
			zoneName:      "Standard shipping",
			estimatedDays: "3-7 business days",
			zoneMatched:   false,
		}, nil
	}

	var zone sqlc.DeliveryZone
	var err error

	if zoneID, parseErr := utils.ParseID(zoneKey); parseErr == nil {
		z, zErr := q.GetPlatformDeliveryZoneByID(ctx, zoneID)
		if zErr == nil {
			return feeForPlatformZone(z)
		}
		z, zErr = q.GetDeliveryZoneByID(ctx, zoneID)
		if zErr == nil && z.Active != 0 {
			return feeForPlatformZone(z)
		}
	}

	zone, err = q.GetPlatformDeliveryZoneByName(ctx, zoneKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return zoneFeeResult{
				fee:           store.ParseDecimalString(vendor.ShippingCost),
				zoneName:      zoneKey,
				estimatedDays: "3-7 business days",
				zoneMatched:   false,
			}, nil
		}
		return zoneFeeResult{}, err
	}
	return feeForPlatformZone(zone)
}

func feeForPlatformZone(zone sqlc.DeliveryZone) (zoneFeeResult, error) {
	estimatedDays := strings.TrimSpace(zone.EstimatedDays)
	if estimatedDays == "" {
		estimatedDays = "3-7 business days"
	}
	return zoneFeeResult{
		fee:           store.ParseDecimalString(zone.BaseCost),
		zoneName:      zone.Name,
		estimatedDays: estimatedDays,
		zoneMatched:   true,
	}, nil
}
