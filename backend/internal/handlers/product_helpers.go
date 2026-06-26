package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/Reactguru24/lumiafrica/internal/catalog"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func int16Bool(v bool) int16 {
	if v {
		return 1
	}
	return 0
}

func parsePathID(c *gin.Context, param string) (types.BinaryUUID, bool) {
	id, err := utils.ParseID(c.Param(param))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid "+param)
		return types.BinaryUUID{}, false
	}
	return id, true
}

func parseUserIDString(s string) (types.BinaryUUID, error) {
	return utils.ParseID(s)
}

func resolveCategoryID(ctx context.Context, q *sqlc.Queries, category, subcategory string) (types.BinaryUUID, error) {
	if err := catalog.EnsureTree(ctx, q); err != nil {
		return types.BinaryUUID{}, err
	}
	return catalog.ResolveCategoryID(ctx, q, category, subcategory)
}

func createProductWithDetails(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID, req models.CreateProductRequest) (types.BinaryUUID, error) {
	categoryID, err := resolveCategoryID(ctx, q, req.Category, req.Subcategory)
	if err != nil {
		return types.BinaryUUID{}, err
	}

	variantStock := models.BuildVariantMatrix(req.Sizes, req.Colors, req.VariantStock)
	if len(variantStock) == 0 {
		return types.BinaryUUID{}, fmt.Errorf("variant stock is required")
	}

	minPrice, maxPrice := req.Price, req.Price
	_ = minPrice
	_ = maxPrice
	totalStock := int32(0)
	for _, v := range variantStock {
		totalStock += int32(v.Stock)
	}
	priceStr := store.FloatToDecimalString(req.Price)
	productID := utils.GenerateBinaryID()

	if err := q.CreateProduct(ctx, sqlc.CreateProductParams{
		ID:          productID,
		VendorID:    vendorID,
		CategoryID:  categoryID,
		Name:        req.Name,
		Description: req.Description,
		Brand:       req.Brand,
		Gender:      sqlc.ProductsGender(req.Gender),
		Sku:         req.SKU,
		MinPrice:    priceStr,
		MaxPrice:    priceStr,
		TotalStock:  totalStock,
		Status:      sqlc.ProductsStatusPending,
		NewArrival:  1,
	}); err != nil {
		return types.BinaryUUID{}, err
	}

	if err := syncProductVariants(ctx, q, productID, req.Price, req.Discount, variantStock); err != nil {
		return types.BinaryUUID{}, err
	}
	for i, url := range req.Images {
		if err := q.CreateProductImage(ctx, sqlc.CreateProductImageParams{
			ID:        utils.GenerateBinaryID(),
			ProductID: productID,
			Url:       url,
			SortOrder: int32(i),
			IsPrimary: int16Bool(i == 0),
		}); err != nil {
			return types.BinaryUUID{}, err
		}
	}
	if err := q.RefreshProductVariantCaches(ctx, productID); err != nil {
		return types.BinaryUUID{}, err
	}
	return productID, nil
}

func syncProductVariants(ctx context.Context, q *sqlc.Queries, productID types.BinaryUUID, price, discount float64, variants models.VariantArray) error {
	_ = q.SoftDeleteProductVariantsByProduct(ctx, productID)
	priceStr := store.FloatToDecimalString(price)
	discountStr := store.FloatToDecimalString(discount)
	for _, v := range variants {
		colorHex := sql.NullString{}
		if err := q.CreateProductVariant(ctx, sqlc.CreateProductVariantParams{
			ID:        utils.GenerateBinaryID(),
			ProductID: productID,
			Size:      v.Size,
			Color:     v.Color,
			ColorHex:  colorHex,
			Price:     priceStr,
			Discount:  discountStr,
			Stock:     int32(v.Stock),
		}); err != nil {
			return err
		}
	}
	return nil
}

func colorHexFor(color string, colors models.ColorArray) sql.NullString {
	for _, c := range colors {
		if c.Name == color && c.Code != "" {
			return sql.NullString{String: c.Code, Valid: true}
		}
	}
	return sql.NullString{}
}
