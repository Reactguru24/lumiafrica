package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"github.com/Reactguru24/lumiafrica/internal/catalog"
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func mapCreateProductError(err error) (int, string) {
	if err == nil {
		return http.StatusInternalServerError, "Failed to create product"
	}
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "invalid category"),
		strings.Contains(msg, "invalid subcategory"),
		strings.Contains(msg, "invalid category/subcategory combination"),
		strings.Contains(msg, "variant stock is required"):
		return http.StatusBadRequest, "Invalid category or subcategory. Please select a valid option from the form."
	case strings.Contains(msg, "duplicate key"), strings.Contains(msg, "unique") && strings.Contains(msg, "sku"):
		return http.StatusConflict, "A product with this SKU already exists"
	default:
		return http.StatusInternalServerError, "Failed to create product"
	}
}

func normalizeProductCategory(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeProductSubcategory(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isValidProductCategorySubcategory(category, subcategory string) bool {
	return catalog.IsValidPair(normalizeProductCategory(category), normalizeProductSubcategory(subcategory))
}

type ProductListResponse struct {
	Items          []models.Product     `json:"items"`
	Total          int64                `json:"total"`
	Page           int                  `json:"page"`
	Limit          int                  `json:"limit"`
	Filters        FilterOptions        `json:"filters"`
	AppliedFilters ProductSearchFilters `json:"appliedFilters"`
}

// ListProducts godoc
// @Summary Search and list products
// @Description Search and list products. All filters are optional; omit filters to fetch active products.
// @Tags Guest
// @Produce json
// @Param q query string false "Search query by product name, description, or brand"
// @Param search query string false "Alias for q"
// @Param category query string false "Category filter"
// @Param subcategory query string false "Subcategory filter"
// @Param gender query string false "Gender filter"
// @Param brand query string false "Brand filter"
// @Param vendorId query string false "Vendor ID filter"
// @Param size query string false "Size filter"
// @Param color query string false "Color filter"
// @Param minPrice query string false "Minimum price"
// @Param maxPrice query string false "Maximum price"
// @Param minRating query string false "Minimum rating from 0 to 5"
// @Param featured query string false "Filter featured products"
// @Param trending query string false "Filter trending products"
// @Param bestseller query string false "Filter bestseller products"
// @Param newArrival query string false "Filter new arrival products (last 7 days)"
// @Param onSale query string false "Filter discounted products"
// @Param sort query string false "Sort order" Enums(newest,popular,rating,trending,bestsellers,price-asc,price-desc,best-rated,best-sellers)
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} handlers.ProductSearchResponse
// @Router /products [get]
func ListProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		result, ok := fetchProductSearchResult(c)
		if !ok {
			return
		}

		utils.Success(c, ProductListResponse{
			Items:          result.Products,
			Total:          result.Total,
			Page:           result.Page,
			Limit:          result.Limit,
			Filters:        getFilterOptions(ctx, getStore(c).Queries()),
			AppliedFilters: result.AppliedFilters,
		})
	}
}

type ProductDetailResponse struct {
	Product         models.Product   `json:"product"`
	Vendor          models.Vendor    `json:"vendor"`
	RelatedProducts []models.Product `json:"relatedProducts"`
}

// GetProduct godoc
// @Summary Get product with vendor details
// @Description Get a product by ID and include the owning vendor details.
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Param relatedLimit query int false "Number of random related products (default 4, max 12)"
// @Success 200 {object} handlers.ProductDetailResponse
// @Router /products/{productID} [get]
func GetProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetProductByID(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if row.Status != sqlc.ProductsStatusActive || row.TotalStock <= 0 {
			utils.Error(c, http.StatusNotFound, "Product not found")
			return
		}

		vendor, err := q.GetVendorByID(ctx, row.VendorID)
		if handleNotFound(c, err, "Vendor not found", "Failed to fetch vendor") {
			return
		}

		relatedLimit := parseQuery(c, "relatedLimit", 4)
		if relatedLimit < 1 {
			relatedLimit = 4
		}
		if relatedLimit > 12 {
			relatedLimit = 12
		}

		relatedRows, err := q.ListRandomRelatedProducts(ctx, sqlc.ListRandomRelatedProductsParams{
			ID:         productID,
			CategoryID: row.CategoryID,
			Limit:      int32(relatedLimit),
		})
		relatedProducts := []models.Product{}
		if err == nil {
			relatedProducts = store.LoadProducts(ctx, q, relatedRows)
		}

		utils.Success(c, ProductDetailResponse{
			Product:         store.LoadProduct(ctx, q, row),
			Vendor:          store.ToVendor(vendor),
			RelatedProducts: relatedProducts,
		})
	}
}

// GetVendorProducts godoc
// @Summary List vendor products
// @Description List all products owned by the authenticated vendor
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Product}
// @Router /vendor/products [get]
func GetVendorProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountVendorProducts(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		rows, err := q.ListVendorProducts(ctx, sqlc.ListVendorProductsParams{
			VendorID: vendorID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		respondPaginated(c, store.LoadProducts(ctx, q, rows), total, page, limit)
	}
}

// CreateProduct godoc
// @Summary Create a product
// @Description Create a new product listing
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param product body models.CreateProductRequest true "Product details"
// @Success 201 {object} map[string]interface{}
// @Router /vendor/products [post]
func CreateProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		var req models.CreateProductRequest
		if !bindJSON(c, &req) {
			return
		}
		req.Category = normalizeProductCategory(req.Category)
		req.Subcategory = normalizeProductSubcategory(req.Subcategory)
		if !isValidProductCategorySubcategory(req.Category, req.Subcategory) {
			utils.Error(c, http.StatusBadRequest, "Invalid category/subcategory combination")
			return
		}
		if len(req.Colors) == 0 {
			utils.Error(c, http.StatusBadRequest, "At least one color is required")
			return
		}

		ctx := c.Request.Context()
		productID, err := createProductWithDetails(ctx, getStore(c).Queries(), vendorID, req)
		if err != nil {
			log.Printf("create product failed: vendor=%s sku=%q name=%q err=%v", vendorIDStr, req.SKU, req.Name, err)
			status, message := mapCreateProductError(err)
			utils.Error(c, status, message)
			return
		}

		invalidateCatalogCache(c)
		utils.SuccessCreated(c, gin.H{
			"id": productID.String(), "name": req.Name, "vendor_id": vendorIDStr, "status": models.StatusPending,
		})
	}
}

// UpdateProduct godoc
// @Summary Update a product
// @Description Update an existing product owned by the vendor
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Param updates body models.UpdateProductRequest true "Product updates"
// @Success 200 {object} models.Product
// @Router /vendor/products/{productID} [put]
func UpdateProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		var req models.UpdateProductRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID}); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		params := sqlc.UpdateProductParams{ID: productID, VendorID: vendorID}
		if req.Name != nil {
			params.Name = sql.NullString{String: *req.Name, Valid: true}
		}
		if req.Description != nil {
			params.Description = sql.NullString{String: *req.Description, Valid: true}
		}
		if req.Brand != nil {
			params.Brand = sql.NullString{String: *req.Brand, Valid: true}
		}
		if req.Category != nil && req.Subcategory != nil {
			categoryID, err := resolveCategoryID(ctx, q, normalizeProductCategory(*req.Category), normalizeProductSubcategory(*req.Subcategory))
			if err != nil {
				utils.Error(c, http.StatusBadRequest, "Invalid category/subcategory combination")
				return
			}
			params.CategoryID = &categoryID
		}
		if req.Gender != nil {
			params.Gender = sqlc.NullProductsGender{ProductsGender: sqlc.ProductsGender(*req.Gender), Valid: true}
		}
		if err := q.UpdateProduct(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update product")
			return
		}

		price := 0.0
		discount := 0.0
		if req.Price != nil {
			price = *req.Price
		}
		if req.Discount != nil {
			discount = *req.Discount
		}
		if req.VariantStock != nil {
			sizes := req.Sizes
			colors := req.Colors
			if sizes == nil || colors == nil {
				variants, _ := q.ListProductVariants(ctx, productID)
				if sizes == nil {
					s := store.VariantsToSizes(variants)
					sizes = &s
				}
				if colors == nil {
					c := store.VariantsToColors(variants)
					colors = &c
				}
			}
			variantStock := models.BuildVariantMatrix(*sizes, *colors, *req.VariantStock)
			if err := syncProductVariants(ctx, q, productID, price, discount, variantStock); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to update variants")
				return
			}
			_ = q.RefreshProductVariantCaches(ctx, productID)
		}
		if req.Images != nil {
			_ = q.DeleteProductImages(ctx, productID)
			for i, url := range *req.Images {
				_ = q.CreateProductImage(ctx, sqlc.CreateProductImageParams{
					ID: utils.GenerateBinaryID(), ProductID: productID, Url: url,
					SortOrder: int32(i), IsPrimary: int16Bool(i == 0),
				})
			}
		}

		updated, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if updated.TotalStock == 0 {
			_ = q.HideOutOfStockProductByVendor(ctx, sqlc.HideOutOfStockProductByVendorParams{ID: productID, VendorID: vendorID})
			updated, _ = q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		}
		invalidateCatalogCache(c)
		utils.Success(c, store.LoadProduct(ctx, q, updated))
	}
}

// RestoreProduct godoc
// @Summary Restore hidden product
// @Description Reactivate a hidden product that still has stock.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Success 200 {object} models.Product
// @Router /vendor/products/{productID}/restore [post]
func RestoreProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		current, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if current.TotalStock <= 0 {
			utils.Error(c, http.StatusBadRequest, "Add stock before restoring this product")
			return
		}
		if current.Status != sqlc.ProductsStatusHidden {
			utils.Error(c, http.StatusBadRequest, "Only hidden products can be restored")
			return
		}
		if err := q.RestoreProductByVendor(ctx, sqlc.RestoreProductByVendorParams{ID: productID, VendorID: vendorID}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to restore product")
			return
		}
		updated, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		invalidateCatalogCache(c)
		utils.Success(c, store.LoadProduct(ctx, q, updated))
	}
}

// SetVendorProductFeatured godoc
// @Summary Set product featured status
// @Description Toggle featured status on a vendor product (requires active subscription for featuring).
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Param featured body models.SetProductFeaturedRequest true "Featured flag"
// @Success 200 {object} models.Product
// @Router /vendor/products/{productID}/featured [put]
func SetVendorProductFeatured() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		var req models.SetProductFeaturedRequest
		if !bindJSON(c, &req) {
			return
		}
		if req.Featured == nil {
			utils.Error(c, http.StatusBadRequest, "Featured flag is required")
			return
		}
		featured := *req.Featured

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		current, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if current.Status != sqlc.ProductsStatusActive && current.Status != sqlc.ProductsStatusPending {
			utils.Error(c, http.StatusBadRequest, "Product cannot be featured")
			return
		}
		if featured {
			slotLimit, err := vendorFeaturedSlotLimit(ctx, q, vendorIDStr, c.MustGet("config").(*config.Config))
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to verify subscription")
				return
			}
			if slotLimit == 0 {
				utils.Error(c, http.StatusForbidden, "An active subscription is required to feature products")
				return
			}
			featuredCount, err := q.CountFeaturedProductsByVendorExceptProduct(ctx, sqlc.CountFeaturedProductsByVendorExceptProductParams{
				VendorID: vendorID, ID: productID,
			})
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to update featured product")
				return
			}
			if featuredCount >= int64(slotLimit) {
				utils.Error(c, http.StatusBadRequest, fmt.Sprintf("You can feature up to %d products on your current plan", slotLimit))
				return
			}
		}
		if err := q.SetProductFeaturedByVendor(ctx, sqlc.SetProductFeaturedByVendorParams{
			Featured: int16Bool(featured),
			ID:       productID,
			VendorID: vendorID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update featured product")
			return
		}
		updated, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if store.LoadProduct(ctx, q, updated).Featured != featured {
			utils.Error(c, http.StatusBadRequest, "Product cannot be featured")
			return
		}
		invalidateCatalogCache(c)
		utils.Success(c, store.LoadProduct(ctx, q, updated))
	}
}

// DeleteProduct godoc
// @Summary Archive product
// @Description Soft-delete (archive) a vendor product.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Success 200 {object} map[string]interface{}
// @Router /vendor/products/{productID} [delete]
func DeleteProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if _, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID}); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if err := q.ArchiveProduct(ctx, sqlc.ArchiveProductParams{ID: productID, VendorID: vendorID}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete product")
			return
		}
		invalidateCatalogCache(c)
		utils.Success(c, gin.H{"archived": true})
	}
}
