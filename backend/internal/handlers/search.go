package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"lumi-backend/internal/catalog"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/models"
	"lumi-backend/internal/redis"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type ProductSearchResponse struct {
	Products       []models.Product     `json:"products"`
	Total          int64                `json:"total"`
	Page           int                  `json:"page"`
	Limit          int                  `json:"limit"`
	Filters        FilterOptions        `json:"filters"`
	AppliedFilters ProductSearchFilters `json:"applied_filters"`
}

type ProductSearchFilters struct {
	Q           *string  `json:"q,omitempty"`
	Search      *string  `json:"search,omitempty"`
	Category    *string  `json:"category,omitempty"`
	Subcategory *string  `json:"subcategory,omitempty"`
	Gender      *string  `json:"gender,omitempty"`
	Brand       *string  `json:"brand,omitempty"`
	VendorID    *string  `json:"vendorId,omitempty"`
	Size        *string  `json:"size,omitempty"`
	Color       *string  `json:"color,omitempty"`
	MinPrice    *float64 `json:"minPrice,omitempty"`
	MaxPrice    *float64 `json:"maxPrice,omitempty"`
	MinRating   *float64 `json:"minRating,omitempty"`
	Featured    *bool    `json:"featured,omitempty"`
	Trending    *bool    `json:"trending,omitempty"`
	Bestseller  *bool    `json:"bestseller,omitempty"`
	NewArrival  *bool    `json:"newArrival,omitempty"`
	OnSale      *bool    `json:"onSale,omitempty"`
	Sort        string   `json:"sort"`
	Page        int      `json:"page"`
	Limit       int      `json:"limit"`
}

type FilterOptions struct {
	Categories    []string           `json:"categories"`
	Subcategories []string           `json:"subcategories"`
	SubcategoriesByCategory map[string][]string `json:"subcategoriesByCategory"`
	Brands        []string           `json:"brands"`
	Genders       []string           `json:"genders"`
	Colors        []string           `json:"colors"`
	Sizes         []string           `json:"sizes"`
	PriceRange    map[string]float64 `json:"priceRange"`
}

type productSearchResult struct {
	Products       []models.Product
	Total          int64
	Page           int
	Limit          int
	AppliedFilters ProductSearchFilters
}

func SearchProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		result, ok := fetchProductSearchResult(c)
		if !ok {
			return
		}

		utils.Success(c, ProductSearchResponse{
			Products:       result.Products,
			Total:          result.Total,
			Page:           result.Page,
			Limit:          result.Limit,
			Filters:        getFilterOptions(ctx, getStore(c).Queries()),
			AppliedFilters: result.AppliedFilters,
		})
	}
}

func fetchProductSearchResult(c *gin.Context) (productSearchResult, bool) {
	ctx := c.Request.Context()
	q := getStore(c).Queries()
	page, limit, offset := pagination(c, 1, 10)

	params, appliedFilters, err := buildSearchProductParams(c, page, limit, offset)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return productSearchResult{}, false
	}

	total, err := q.CountSearchProducts(ctx, searchCountParams(params))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to search products")
		return productSearchResult{}, false
	}

	rows, err := q.SearchProducts(ctx, params)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to search products")
		return productSearchResult{}, false
	}

	return productSearchResult{
		Products:       store.LoadProducts(ctx, q, rows),
		Total:          total,
		Page:           page,
		Limit:          limit,
		AppliedFilters: appliedFilters,
	}, true
}

func searchCountParams(params sqlc.SearchProductsParams) sqlc.CountSearchProductsParams {
	return sqlc.CountSearchProductsParams{
		Q:            params.Q,
		Category:     params.Category,
		Subcategory:  params.Subcategory,
		Brand:        params.Brand,
		Gender:       params.Gender,
		VendorID:     params.VendorID,
		Size:         params.Size,
		Color:        params.Color,
		MinPrice:     params.MinPrice,
		MaxPrice:     params.MaxPrice,
		MinRating:    params.MinRating,
		FeaturedOnly:   params.FeaturedOnly,
		TrendingOnly:   params.TrendingOnly,
		BestsellerOnly: params.BestsellerOnly,
		NewArrivalOnly: params.NewArrivalOnly,
		OnSaleOnly:     params.OnSaleOnly,
	}
}

func buildSearchProductParams(c *gin.Context, page, limit, offset int) (sqlc.SearchProductsParams, ProductSearchFilters, error) {
	sortBy := normalizeProductSort(c.Query("sort"))
	newArrivalOnly := queryBool(c, "newArrival")
	if newArrivalOnly {
		sortBy = "newest"
	}
	appliedFilters := ProductSearchFilters{
		Sort:  sortBy,
		Page:  page,
		Limit: limit,
	}

	params := sqlc.SearchProductsParams{
		FeaturedOnly:   queryBool(c, "featured"),
		TrendingOnly:   queryBool(c, "trending"),
		BestsellerOnly: queryBool(c, "bestseller"),
		NewArrivalOnly: newArrivalOnly,
		OnSaleOnly:     queryBool(c, "onSale"),
		SortBy:         sortBy,
		Limit:          int32(limit),
		Offset:         int32(offset),
	}

	params.Q = optionalStringFromValue(firstNonEmpty(c.Query("q"), c.Query("search")))
	params.Category = optionalString(c, "category")
	params.Subcategory = optionalString(c, "subcategory")
	params.Brand = optionalString(c, "brand")
	params.Gender = optionalGender(c.Query("gender"))
	params.VendorID = optionalVendorID(c, "vendorId")
	params.Size = optionalString(c, "size")
	params.Color = optionalString(c, "color")

	appliedFilters.Q = optionalStringFilter(c, "q")
	appliedFilters.Search = optionalStringFilter(c, "search")
	appliedFilters.Category = optionalStringFilter(c, "category")
	appliedFilters.Subcategory = optionalStringFilter(c, "subcategory")
	appliedFilters.Gender = optionalStringFilter(c, "gender")
	appliedFilters.Brand = optionalStringFilter(c, "brand")
	appliedFilters.VendorID = optionalStringFilter(c, "vendorId")
	appliedFilters.Size = optionalStringFilter(c, "size")
	appliedFilters.Color = optionalStringFilter(c, "color")
	appliedFilters.Featured = optionalBoolFilter(c, "featured")
	appliedFilters.Trending = optionalBoolFilter(c, "trending")
	appliedFilters.Bestseller = optionalBoolFilter(c, "bestseller")
	appliedFilters.NewArrival = optionalBoolFilter(c, "newArrival")
	appliedFilters.OnSale = optionalBoolFilter(c, "onSale")

	minPrice, err := optionalDecimalFilter(c, "minPrice")
	if err != nil {
		return sqlc.SearchProductsParams{}, ProductSearchFilters{}, err
	}
	maxPrice, err := optionalDecimalFilter(c, "maxPrice")
	if err != nil {
		return sqlc.SearchProductsParams{}, ProductSearchFilters{}, err
	}
	minRating, err := optionalRatingFilter(c, "minRating")
	if err != nil {
		return sqlc.SearchProductsParams{}, ProductSearchFilters{}, err
	}

	if minPrice.SQL.Valid && maxPrice.SQL.Valid {
		min, _ := strconv.ParseFloat(minPrice.SQL.String, 64)
		max, _ := strconv.ParseFloat(maxPrice.SQL.String, 64)
		if min > max {
			return sqlc.SearchProductsParams{}, ProductSearchFilters{}, fmt.Errorf("minPrice must be less than or equal to maxPrice")
		}
	}

	params.MinPrice = minPrice.SQL
	params.MaxPrice = maxPrice.SQL
	params.MinRating = minRating.SQL
	appliedFilters.MinPrice = minPrice.Value
	appliedFilters.MaxPrice = maxPrice.Value
	appliedFilters.MinRating = minRating.Value
	return params, appliedFilters, nil
}

func optionalVendorID(c *gin.Context, key string) *types.BinaryUUID {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return nil
	}
	id, err := utils.ParseID(value)
	if err != nil {
		return nil
	}
	return &id
}

func optionalString(c *gin.Context, key string) sql.NullString {
	return optionalStringFromValue(c.Query(key))
}

func optionalStringFromValue(value string) sql.NullString {
	value = strings.TrimSpace(value)
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}

func optionalStringFilter(c *gin.Context, key string) *string {
	value, ok := c.GetQuery(key)
	if !ok {
		return nil
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func optionalBoolFilter(c *gin.Context, key string) *bool {
	if _, ok := c.GetQuery(key); !ok {
		return nil
	}
	value := queryBool(c, key)
	return &value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func optionalGender(value string) sqlc.NullProductsGender {
	value = strings.TrimSpace(value)
	if value == "" {
		return sqlc.NullProductsGender{}
	}
	return sqlc.NullProductsGender{ProductsGender: sqlc.ProductsGender(value), Valid: true}
}

type numericFilter struct {
	SQL   sql.NullString
	Value *float64
}

func optionalDecimalFilter(c *gin.Context, key string) (numericFilter, error) {
	value, ok := c.GetQuery(key)
	if !ok {
		return numericFilter{}, nil
	}
	amount, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil || amount < 0 {
		return numericFilter{}, fmt.Errorf("%s must be a non-negative number", key)
	}
	return numericFilter{
		SQL:   sql.NullString{String: strconv.FormatFloat(amount, 'f', 2, 64), Valid: true},
		Value: &amount,
	}, nil
}

func optionalRatingFilter(c *gin.Context, key string) (numericFilter, error) {
	value, ok := c.GetQuery(key)
	if !ok {
		return numericFilter{}, nil
	}
	rating, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil || rating < 0 || rating > 5 {
		return numericFilter{}, fmt.Errorf("%s must be between 0 and 5", key)
	}
	return numericFilter{
		SQL:   sql.NullString{String: strconv.FormatFloat(rating, 'f', 2, 64), Valid: true},
		Value: &rating,
	}, nil
}

func queryBool(c *gin.Context, key string) bool {
	value := strings.ToLower(strings.TrimSpace(c.Query(key)))
	return value == "true" || value == "1" || value == "yes"
}

func normalizeProductSort(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "popular", "rating", "trending", "bestsellers", "price-asc", "price-desc", "newest":
		return strings.ToLower(strings.TrimSpace(value))
	case "best-rated", "best_rated", "bestrated":
		return "rating"
	case "best-sellers", "best_sellers", "bestseller":
		return "bestsellers"
	case "price-low", "price_low", "price-low-to-high":
		return "price-asc"
	case "price-high", "price_high", "price-high-to-low":
		return "price-desc"
	default:
		return "newest"
	}
}

func getFilterOptions(ctx context.Context, q *sqlc.Queries) FilterOptions {
	brands, _ := q.ListDistinctBrands(ctx)
	colors, _ := q.ListDistinctColors(ctx)
	sizes, _ := q.ListDistinctSizes(ctx)
	priceRange, _ := q.GetProductPriceRange(ctx)
	return FilterOptions{
		Categories:    catalog.Categories(),
		Subcategories: catalog.FlatSubcategories(),
		SubcategoriesByCategory: catalog.SubcategoriesByCategory(),
		Brands:        brands,
		Genders: []string{
			string(models.GenderMen), string(models.GenderWomen),
			string(models.GenderKids), string(models.GenderUnisex),
		},
		Colors: colors,
		Sizes:  sizes,
		PriceRange: map[string]float64{
			"min": store.ToFloat(priceRange.MinPrice),
			"max": store.ToFloat(priceRange.MaxPrice),
		},
	}
}

// GetProductFilters godoc
// @Summary Get product filter options
// @Description Returns available filter dropdown values derived from active products in the database
// @Tags Guest
// @Produce json
// @Success 200 {object} handlers.FilterOptions
// @Router /products/filters [get]
func GetProductFilters() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rc := getRedis(c)

		var cached FilterOptions
		if found, err := rc.GetJSON(ctx, redis.KeyProductFilters, &cached); err == nil && found {
			utils.Success(c, cached)
			return
		}

		filters := getFilterOptions(ctx, getStore(c).Queries())
		_ = rc.SetJSON(ctx, redis.KeyProductFilters, filters, 5*time.Minute)
		utils.Success(c, filters)
	}
}
