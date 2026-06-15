package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const defaultShippingCost = 10.0

// CreateOrder godoc
// @Summary Create an order
// @Description Create a new order from cart items
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param order body models.CreateOrderRequest true "Order details"
// @Success 201 {object} map[string]interface{}
// @Router /orders [post]
func CreateOrder() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		var req models.CreateOrderRequest
		if !bindJSON(c, &req) {
			return
		}

		itemsJSON, err := json.Marshal(req.Items)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid items format")
			return
		}
		if len(req.Items) == 0 {
			utils.Error(c, http.StatusBadRequest, "Order must contain at least one item")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		subtotal, err := validateOrderItems(ctx, q, req.Items)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}

		orderID := utils.GenerateID()
		if err := q.CreateOrder(ctx, sqlc.CreateOrderParams{
			ID:              orderID,
			UserID:          userID,
			Items:           itemsJSON,
			Subtotal:        store.FloatToDecimalString(subtotal),
			ShippingCost:    store.FloatToDecimalString(defaultShippingCost),
			Total:           store.FloatToDecimalString(subtotal + defaultShippingCost),
			PaymentMethod:   req.PaymentMethod,
			DeliveryAddress: req.DeliveryAddress,
			Notes:           sql.NullString{String: derefString(req.Notes), Valid: req.Notes != nil},
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create order")
			return
		}

		utils.SuccessCreated(c, gin.H{"id": orderID})
	}
}

// GetUserOrders godoc
// @Summary List customer orders
// @Description List all orders for the authenticated customer
// @Tags Customer
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Order}
// @Router /orders [get]
func GetUserOrders() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountOrdersByUser(ctx, userID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		rows, err := q.ListOrdersByUser(ctx, sqlc.ListOrdersByUserParams{
			UserID: userID, Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		respondPaginated(c, store.ToOrders(rows), total, page, limit)
	}
}

// GetOrder godoc
// @Summary Get order details
// @Description Get a specific order for the authenticated customer
// @Tags Customer
// @Produce json
// @Security Bearer
// @Param orderID path string true "Order ID"
// @Success 200 {object} models.Order
// @Router /orders/{orderID} [get]
func GetOrder() gin.HandlerFunc {
	return func(c *gin.Context) {
		row, err := getStore(c).Queries().GetOrderByIDAndUser(c.Request.Context(), sqlc.GetOrderByIDAndUserParams{
			ID: c.Param("orderID"), UserID: middleware.GetUserID(c),
		})
		if handleNotFound(c, err, "Order not found", "Failed to fetch order") {
			return
		}
		utils.Success(c, store.ToOrder(row))
	}
}

// UpdateOrderStatus godoc
// @Summary Update order status
// @Description Vendor updates order status (processing, shipped, delivered, cancelled)
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param orderID path string true "Order ID"
// @Param status body models.UpdateOrderStatusRequest true "Status update"
// @Success 200 {object} models.Order
// @Router /vendor/orders/{orderID}/status [put]
func UpdateOrderStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		orderID := c.Param("orderID")
		var req models.UpdateOrderStatusRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		_, err := q.GetOrderByID(ctx, orderID)
		if handleNotFound(c, err, "Order not found", "Failed to fetch order") {
			return
		}

		var deliveredAt sql.NullTime
		if req.Status == models.OrderStatusDelivered {
			deliveredAt = sql.NullTime{Time: utils.Now(), Valid: true}
		}
		if err := q.UpdateOrderStatus(ctx, sqlc.UpdateOrderStatusParams{
			Status: sqlc.OrdersStatus(req.Status), DeliveredAt: deliveredAt, ID: orderID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update order status")
			return
		}

		updated, err := q.GetOrderByID(ctx, orderID)
		if handleNotFound(c, err, "Order not found", "Failed to fetch order") {
			return
		}
		utils.Success(c, store.ToOrder(updated))
	}
}

// GetVendorOrders godoc
// @Summary List vendor orders
// @Description List recent orders for the vendor
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Order}
// @Router /vendor/orders [get]
func GetVendorOrders() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountOrdersByVendor(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		rows, err := q.ListOrdersByVendor(ctx, sqlc.ListOrdersByVendorParams{
			VendorID: vendorID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		respondPaginated(c, store.ToOrders(rows), total, page, limit)
	}
}

// GetAllOrders godoc
// @Summary List all orders
// @Description List all orders for admin
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Order}
// @Router /admin/orders [get]
func GetAllOrders() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		st := getStore(c)
		q := st.Queries()
		page, limit, offset := pagination(c, 1, 10)

		var total int64
		if err := st.DB().SQL.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders").Scan(&total); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to count orders")
			return
		}

		all, err := q.ListRecentOrders(ctx, int32(offset+limit))
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		if offset < len(all) {
			all = all[offset:]
		}
		if len(all) > limit {
			all = all[:limit]
		}
		respondPaginated(c, store.ToOrders(all), total, page, limit)
	}
}

func validateOrderItems(ctx context.Context, q *sqlc.Queries, items []models.OrderItem) (float64, error) {
	var subtotal float64
	for _, item := range items {
		if item.ProductID == "" {
			return 0, errors.New("product_id is required for every item")
		}
		if item.Quantity <= 0 {
			return 0, errors.New("quantity must be greater than 0")
		}
		if item.Size == "" {
			return 0, errors.New("size is required for every item")
		}

		product, err := q.GetProductByID(ctx, item.ProductID)
		if errors.Is(err, sql.ErrNoRows) {
			return 0, errors.New("product not found or unavailable: " + item.ProductID)
		}
		if err != nil {
			return 0, errors.New("failed to fetch product: " + item.ProductID)
		}
		if models.ProductStatus(product.Status) != models.StatusActive {
			return 0, errors.New("product is not available: " + item.ProductID)
		}
		if product.Stock < int32(item.Quantity) {
			return 0, errors.New("insufficient stock for product: " + item.ProductID)
		}
		if item.VendorID != "" && item.VendorID != product.VendorID {
			return 0, errors.New("vendor_id does not match product: " + item.ProductID)
		}
		if !productHasSize(product.Sizes, item.Size) {
			return 0, errors.New("size is not available for product: " + item.ProductID)
		}

		subtotal += store.ToFloat(product.Price) * float64(item.Quantity)
	}
	return subtotal, nil
}

func productHasSize(sizes json.RawMessage, size string) bool {
	var available []string
	if err := json.Unmarshal(sizes, &available); err != nil {
		return false
	}
	for _, availableSize := range available {
		if availableSize == size {
			return true
		}
	}
	return false
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
