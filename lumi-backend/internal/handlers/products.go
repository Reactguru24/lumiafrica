package handlers

import (
	"database/sql"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

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
// @Param onSale query string false "Filter discounted products"
// @Param sort query string false "Sort order" Enums(newest,popular,rating,trending,bestsellers,price-asc,price-desc)
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
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		productID := c.Param("productID")
		row, err := q.GetProductByID(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
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
			ID:    productID,
			Limit: int32(relatedLimit),
		})
		relatedProducts := []models.Product{}
		if err == nil {
			relatedProducts = store.ToProducts(relatedRows)
		}

		utils.Success(c, ProductDetailResponse{
			Product:         store.ToProduct(row),
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
		vendorID, ok := getVendorID(c)
		if !ok {
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
		respondPaginated(c, store.ToProducts(rows), total, page, limit)
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
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		var req models.CreateProductRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		if err := getStore(c).Queries().CreateProduct(ctx, sqlc.CreateProductParams{
			ID:          utils.GenerateID(),
			VendorID:    vendorID,
			Name:        req.Name,
			Description: req.Description,
			Brand:       req.Brand,
			Category:    req.Category,
			Subcategory: req.Subcategory,
			Gender:      sqlc.ProductsGender(req.Gender),
			Price:       store.FloatToDecimalString(req.Price),
			Discount:    sql.NullString{String: store.FloatToDecimalString(req.Discount), Valid: true},
			Images:      store.StringArrayToJSON(req.Images),
			Colors:      store.ColorArrayToJSON(req.Colors),
			Sizes:       store.StringArrayToJSON(req.Sizes),
			Sku:         req.SKU,
			Stock:       int32(req.Stock),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create product")
			return
		}

		utils.SuccessCreated(c, gin.H{
			"name": req.Name, "vendor_id": vendorID, "status": models.StatusPending,
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
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		productID := c.Param("productID")
		var req models.UpdateProductRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		_, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
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
		if req.Category != nil {
			params.Category = sql.NullString{String: *req.Category, Valid: true}
		}
		if req.Subcategory != nil {
			params.Subcategory = sql.NullString{String: *req.Subcategory, Valid: true}
		}
		if req.Gender != nil {
			params.Gender = sqlc.NullProductsGender{ProductsGender: sqlc.ProductsGender(*req.Gender), Valid: true}
		}
		if req.Price != nil {
			params.Price = sql.NullString{String: store.FloatToDecimalString(*req.Price), Valid: true}
		}
		if req.Stock != nil {
			params.Stock = sql.NullInt32{Int32: int32(*req.Stock), Valid: true}
		}
		if req.Discount != nil {
			params.Discount = sql.NullString{String: store.FloatToDecimalString(*req.Discount), Valid: true}
		}
		if req.Sizes != nil {
			params.Sizes = store.StringArrayToJSON(*req.Sizes)
		}
		if req.Colors != nil {
			params.Colors = store.ColorArrayToJSON(*req.Colors)
		}
		if req.Images != nil {
			params.Images = store.StringArrayToJSON(*req.Images)
		}

		if err := q.UpdateProduct(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update product")
			return
		}

		updated, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID})
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		utils.Success(c, store.ToProduct(updated))
	}
}

// DeleteProduct godoc
// @Summary Delete a product
// @Description Archive a product owned by the vendor
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param productID path string true "Product ID"
// @Success 204 {object} map[string]interface{}
// @Router /vendor/products/{productID} [delete]
func DeleteProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		productID := c.Param("productID")
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if _, err := q.GetProductByVendor(ctx, sqlc.GetProductByVendorParams{ID: productID, VendorID: vendorID}); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if err := q.ArchiveProduct(ctx, sqlc.ArchiveProductParams{ID: productID, VendorID: vendorID}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete product")
			return
		}
		utils.Success(c, gin.H{"archived": true})
	}
}
