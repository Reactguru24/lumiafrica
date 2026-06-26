package seeder

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"lumi-backend/internal/catalog"
	"lumi-backend/internal/database"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
)

func int16Bool(value bool) int16 {
	if value {
		return 1
	}
	return 0
}

func slugToName(slug string) string {
	parts := strings.Split(slug, "-")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func resolveCategoryID(ctx context.Context, q *sqlc.Queries, category, subcategory string) (types.BinaryUUID, error) {
	if err := catalog.EnsureTree(ctx, q); err != nil {
		return types.BinaryUUID{}, err
	}
	return catalog.ResolveCategoryID(ctx, q, category, subcategory)
}

func distributeVariantStock(sizes models.StringArray, colors models.ColorArray, total int) models.VariantArray {
	matrix := models.BuildVariantMatrix(sizes, colors, nil)
	if len(matrix) == 0 {
		return nil
	}
	per := total / len(matrix)
	if per < 1 {
		per = 1
	}
	for i := range matrix {
		matrix[i].Stock = per
	}
	return matrix
}

func colorHexFor(color string, colors models.ColorArray) sql.NullString {
	for _, c := range colors {
		if c.Name == color && c.Code != "" {
			return sql.NullString{String: c.Code, Valid: true}
		}
	}
	return sql.NullString{}
}

func createSeedProduct(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID, p productSeed, featured bool) (types.BinaryUUID, error) {
	categoryID, err := resolveCategoryID(ctx, q, p.category, p.subcategory)
	if err != nil {
		return types.BinaryUUID{}, err
	}

	variantStock := distributeVariantStock(p.sizes, p.colors, p.stock)
	if len(variantStock) == 0 {
		return types.BinaryUUID{}, fmt.Errorf("variant stock is required for %s", p.name)
	}

	totalStock := int32(0)
	for _, v := range variantStock {
		totalStock += int32(v.Stock)
	}

	priceStr := store.FloatToDecimalString(p.price)
	discountStr := store.FloatToDecimalString(p.discount)
	productID := utils.GenerateBinaryID()

	if err := q.CreateProduct(ctx, sqlc.CreateProductParams{
		ID:          productID,
		VendorID:    vendorID,
		CategoryID:  categoryID,
		Name:        p.name,
		Description: p.description,
		Brand:       p.brand,
		Gender:      sqlc.ProductsGender(p.gender),
		Sku:         p.sku,
		MinPrice:    priceStr,
		MaxPrice:    priceStr,
		TotalStock:  totalStock,
		Status:      sqlc.ProductsStatusActive,
		Bestseller:  int16Bool(p.bestseller),
		NewArrival:  int16Bool(p.newArrival),
		Featured:    int16Bool(featured),
		Trending:    int16Bool(p.trending),
	}); err != nil {
		return types.BinaryUUID{}, err
	}

	for _, v := range variantStock {
		if err := q.CreateProductVariant(ctx, sqlc.CreateProductVariantParams{
			ID:        utils.GenerateBinaryID(),
			ProductID: productID,
			Size:      v.Size,
			Color:     v.Color,
			ColorHex:  colorHexFor(v.Color, p.colors),
			Price:     priceStr,
			Discount:  discountStr,
			Stock:     int32(v.Stock),
		}); err != nil {
			return types.BinaryUUID{}, err
		}
	}

	if p.image != "" {
		if err := q.CreateProductImage(ctx, sqlc.CreateProductImageParams{
			ID:        utils.GenerateBinaryID(),
			ProductID: productID,
			Url:       p.image,
			SortOrder: 0,
			IsPrimary: 1,
		}); err != nil {
			return types.BinaryUUID{}, err
		}
	}

	if err := q.RefreshProductVariantCaches(ctx, productID); err != nil {
		return types.BinaryUUID{}, err
	}

	return productID, nil
}

func createSeedOrderItem(ctx context.Context, q *sqlc.Queries, orderID, productID types.BinaryUUID, size, color string, quantity int32) error {
	variant, err := q.GetProductVariantByProductSizeColor(ctx, sqlc.GetProductVariantByProductSizeColorParams{
		ProductID: productID,
		Size:      size,
		Color:     color,
	})
	if err != nil {
		return err
	}

	product, err := q.GetProductByID(ctx, productID)
	if err != nil {
		return err
	}

	unitPrice := store.ParseDecimalString(variant.Price)
	discountPct := store.ParseDecimalString(variant.Discount)
	if discountPct > 0 {
		unitPrice = unitPrice * (1 - discountPct/100)
	}
	lineSubtotal := unitPrice * float64(quantity)

	commissionRate := 10.0
	if rate, err := q.GetVendorCommissionRate(ctx, product.VendorID); err == nil {
		commissionRate = store.ParseDecimalString(rate)
	}
	platformFee := lineSubtotal * (commissionRate / 100)
	vendorEarnings := lineSubtotal - platformFee

	imageURL := sql.NullString{}
	images, _ := q.ListProductImages(ctx, productID)
	if len(images) > 0 {
		imageURL = sql.NullString{String: images[0].Url, Valid: true}
	}

	return q.CreateOrderItem(ctx, sqlc.CreateOrderItemParams{
		ID:             utils.GenerateBinaryID(),
		OrderID:        orderID,
		ProductID:      productID,
		VariantID:      variant.ID,
		VendorID:       product.VendorID,
		ProductName:    product.Name,
		Sku:            product.Sku,
		Size:           size,
		Color:          color,
		ImageUrl:       imageURL,
		UnitPrice:      store.FloatToDecimalString(unitPrice),
		Discount:       store.FloatToDecimalString(discountPct),
		Quantity:       quantity,
		Subtotal:       store.FloatToDecimalString(lineSubtotal),
		VendorEarnings: store.FloatToDecimalString(vendorEarnings),
		PlatformFee:    store.FloatToDecimalString(platformFee),
	})
}

func deliveryAddressJSON() json.RawMessage {
	addr, _ := json.Marshal(map[string]string{
		"label":    "Home",
		"street":   "123 Main St",
		"city":     "Nairobi",
		"state":    "Nairobi",
		"country":  "Kenya",
		"zip_code": "00100",
	})
	return addr
}

func getUserByEmail(db *database.DB, email string) (*sqlc.User, error) {
	user, err := db.Q.GetUserByEmail(context.Background(), email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func getVendorByEmail(db *database.DB, email string) (*sqlc.Vendor, error) {
	user, err := db.Q.GetUserByEmail(context.Background(), email)
	if err != nil {
		return nil, err
	}
	vendor, err := db.Q.GetVendorByUserID(context.Background(), user.ID)
	if err != nil {
		return nil, err
	}
	return &vendor, nil
}

func reviewRatingForProduct(i, j int) int16 {
	base := int16(4 + (i % 2))
	if i < 9 {
		base = int16(5 - (j % 2))
	}
	return base
}

func reviewCommentForProduct(i, j int) string {
	comments := []string{
		"Excellent quality and true to size.",
		"Fast delivery and the finish looks premium.",
		"Great value for money, I would buy again.",
	}
	return fmt.Sprintf("%s Seed review %d for product %d.", comments[(i+j)%len(comments)], j+1, i+1)
}

func refreshVendorRating(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID) error {
	products, err := q.ListProductsByVendor(ctx, vendorID)
	if err != nil {
		return err
	}
	if len(products) == 0 {
		return nil
	}

	var sum float64
	var count int
	for _, product := range products {
		rating := store.ParseDecimalString(product.Rating)
		if rating <= 0 {
			continue
		}
		sum += rating
		count++
	}
	if count == 0 {
		return nil
	}

	avg := sum / float64(count)
	return q.UpdateVendorRating(ctx, sqlc.UpdateVendorRatingParams{
		Rating: store.FloatToDecimalString(avg),
		ID:     vendorID,
	})
}
