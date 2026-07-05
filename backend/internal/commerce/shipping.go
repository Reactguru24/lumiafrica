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

const defaultLaneFee = 400.0

type VendorShippingLine struct {
	VendorID        string   `json:"vendorId"`
	StoreName       string   `json:"storeName"`
	OriginCity      string   `json:"originCity"`
	DestinationCity string   `json:"destinationCity"`
	Subtotal        float64  `json:"subtotal"`
	ShippingCost    float64  `json:"shippingCost"`
	EstimatedDays   string   `json:"estimatedDays"`
	LaneMatched     bool     `json:"laneMatched"`
	ProductIDs      []string `json:"productIds"`
}

type variantLineKey struct {
	productID types.BinaryUUID
	size      string
	color     string
}

// NormalizeCity trims suffixes and standardizes city names for lane lookup.
func NormalizeCity(name string) string {
	s := strings.TrimSpace(name)
	s = strings.TrimSuffix(s, " Metro")
	s = strings.TrimSuffix(s, " County")
	if s == "" {
		return ""
	}
	return strings.ToLower(s)
}

// DisplayCity formats a city name for display and lane lookup.
func DisplayCity(name string) string {
	return displayCity(name)
}

func displayCity(name string) string {
	s := strings.TrimSpace(name)
	s = strings.TrimSuffix(s, " Metro")
	s = strings.TrimSuffix(s, " County")
	if s == "" {
		return "Unknown"
	}
	return strings.ToUpper(s[:1]) + strings.ToLower(s[1:])
}

// ResolveVendorShipping groups cart items by vendor and calculates one shipping fee
// per vendor based on shop city → customer delivery city lane rates.
func ResolveVendorShipping(ctx context.Context, q *sqlc.Queries, items []models.OrderItem, destinationCity string) (float64, []VendorShippingLine, error) {
	if len(items) == 0 {
		return 0, nil, fmt.Errorf("cart is empty")
	}
	dest := displayCity(destinationCity)
	if NormalizeCity(dest) == "" {
		return 0, nil, fmt.Errorf("delivery city is required")
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

		fee, days, matched, origin := laneFeeForVendor(ctx, q, vendor, dest)
		if vendor.FreeShippingThreshold.Valid {
			threshold := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
			if threshold > 0 && subtotal >= threshold {
				fee = 0
				days = "Free shipping"
				matched = true
			}
		}

		totalShipping += fee
		productIDs := make([]string, 0, len(vendorProducts[vendorID]))
		for pid := range vendorProducts[vendorID] {
			productIDs = append(productIDs, pid)
		}
		lines = append(lines, VendorShippingLine{
			VendorID:        vendorID.String(),
			StoreName:       vendor.StoreName,
			OriginCity:      origin,
			DestinationCity: dest,
			Subtotal:        subtotal,
			ShippingCost:    fee,
			EstimatedDays:   days,
			LaneMatched:     matched,
			ProductIDs:      productIDs,
		})
	}

	return totalShipping, lines, nil
}

func laneFeeForVendor(ctx context.Context, q *sqlc.Queries, vendor sqlc.Vendor, destinationCity string) (fee float64, estimatedDays string, matched bool, originDisplay string) {
	origin := displayCity(vendor.City)
	if origin == "Unknown" {
		origin = displayCity(vendor.Country)
	}
	originDisplay = origin

	lane, err := q.GetShippingLaneRate(ctx, origin, destinationCity)
	if err == nil {
		return store.ParseDecimalString(lane.Fee), lane.EstimatedDays, true, originDisplay
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return defaultLaneFee, "3-7 business days", false, originDisplay
	}

	fallback := store.ParseDecimalString(vendor.ShippingCost)
	if fallback <= 0 {
		fallback = defaultLaneFee
	}
	return fallback, "3-7 business days", false, originDisplay
}
