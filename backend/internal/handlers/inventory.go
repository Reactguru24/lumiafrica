package handlers

import (
	"context"
	"fmt"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
)

type variantKey struct {
	productID types.BinaryUUID
	size      string
	color     string
}

func validateVariantOrderItems(ctx context.Context, q *sqlc.Queries, items []models.OrderItem) (float64, error) {
	qtyByVariant := make(map[variantKey]int)
	for _, item := range items {
		if item.Color == "" {
			return 0, fmt.Errorf("color is required for every item")
		}
		productID, err := utils.ParseID(item.ProductID)
		if err != nil {
			return 0, fmt.Errorf("invalid product id")
		}
		key := variantKey{productID: productID, size: item.Size, color: item.Color}
		qtyByVariant[key] += item.Quantity
	}

	var subtotal float64
	productCache := make(map[types.BinaryUUID]sqlc.Product)
	variantCache := make(map[variantKey]sqlc.ProductVariant)

	for key, totalQty := range qtyByVariant {
		product, ok := productCache[key.productID]
		if !ok {
			row, err := q.GetProductByID(ctx, key.productID)
			if err != nil {
				return 0, fmt.Errorf("product not found or unavailable")
			}
			product = row
			productCache[key.productID] = product
		}
		if models.ProductStatus(product.Status) != models.StatusActive {
			return 0, fmt.Errorf("\"%s\" is no longer available", product.Name)
		}

		variant, ok := variantCache[key]
		if !ok {
			row, err := q.GetProductVariantByProductSizeColor(ctx, sqlc.GetProductVariantByProductSizeColorParams{
				ProductID: key.productID, Size: key.size, Color: key.color,
			})
			if err != nil {
				return 0, fmt.Errorf("%s / %s is not available for \"%s\"", key.size, key.color, product.Name)
			}
			variant = row
			variantCache[key] = variant
		}
		if variant.Stock < int32(totalQty) {
			if variant.Stock == 0 {
				return 0, fmt.Errorf("\"%s\" (%s, %s) is out of stock", product.Name, key.size, key.color)
			}
			return 0, fmt.Errorf("only %d left in stock for \"%s\" (%s, %s)", variant.Stock, product.Name, key.size, key.color)
		}
	}

	for _, item := range items {
		productID, _ := utils.ParseID(item.ProductID)
		product := productCache[productID]
		key := variantKey{productID: productID, size: item.Size, color: item.Color}
		variant := variantCache[key]
		if item.VendorID != "" && item.VendorID != product.VendorID.String() {
			return 0, fmt.Errorf("vendor mismatch for \"%s\"", product.Name)
		}
		price := store.ParseDecimalString(variant.Price)
		if discount := store.ParseDecimalString(variant.Discount); discount > 0 {
			price = price * (1 - discount/100)
		}
		subtotal += price * float64(item.Quantity)
	}
	return subtotal, nil
}

func decrementVariantOrderStock(ctx context.Context, q *sqlc.Queries, items []models.OrderItem) error {
	qtyByVariant := make(map[variantKey]int)
	namesByVariant := make(map[variantKey]string)
	for _, item := range items {
		productID, err := utils.ParseID(item.ProductID)
		if err != nil {
			return fmt.Errorf("invalid product id")
		}
		key := variantKey{productID: productID, size: item.Size, color: item.Color}
		qtyByVariant[key] += item.Quantity
		if item.ProductName != "" {
			namesByVariant[key] = item.ProductName
		}
	}

	touchedProducts := make(map[types.BinaryUUID]struct{})
	for key, totalQty := range qtyByVariant {
		variant, err := q.GetProductVariantByProductSizeColor(ctx, sqlc.GetProductVariantByProductSizeColorParams{
			ProductID: key.productID, Size: key.size, Color: key.color,
		})
		if err != nil {
			return fmt.Errorf("variant not found")
		}
		rows, err := q.DecrementProductStock(ctx, sqlc.DecrementProductStockParams{
			Stock: int32(totalQty), ID: variant.ID, Stock_2: int32(totalQty),
		})
		if err != nil {
			return fmt.Errorf("failed to update stock")
		}
		if rows == 0 {
			name := namesByVariant[key]
			if name == "" {
				if product, perr := q.GetProductByID(ctx, key.productID); perr == nil {
					name = product.Name
				}
			}
			return fmt.Errorf("insufficient stock for \"%s\"", name)
		}
		touchedProducts[key.productID] = struct{}{}
	}
	for productID := range touchedProducts {
		if err := q.RefreshProductVariantCaches(ctx, productID); err != nil {
			return fmt.Errorf("failed to refresh product stock")
		}
	}
	return nil
}

func validateOrderItems(ctx context.Context, q *sqlc.Queries, items []models.OrderItem) (float64, error) {
	if len(items) == 0 {
		return 0, fmt.Errorf("order must contain at least one item")
	}
	for _, item := range items {
		if item.ProductID == "" {
			return 0, fmt.Errorf("product_id is required for every item")
		}
		if item.Quantity <= 0 {
			return 0, fmt.Errorf("quantity must be greater than 0")
		}
		if item.Size == "" {
			return 0, fmt.Errorf("size is required for every item")
		}
	}
	return validateVariantOrderItems(ctx, q, items)
}

func decrementOrderStock(ctx context.Context, q *sqlc.Queries, items []models.OrderItem) error {
	return decrementVariantOrderStock(ctx, q, items)
}
