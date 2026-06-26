package handlers

import (
	"database/sql"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	defaultShippingCost = 10.0
	defaultTaxRate      = 0.0
)

// GetUserOrders godoc
// @Summary List customer orders
// @Description Returns paginated orders for the signed-in customer.
// @Tags Customer
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /orders [get]
func GetUserOrders() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
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
		respondPaginated(c, store.LoadOrders(ctx, q, rows), total, page, limit)
	}
}

// GetOrder godoc
// @Summary Get customer order by ID
// @Description Returns a single order belonging to the signed-in customer.
// @Tags Customer
// @Produce json
// @Security Bearer
// @Param orderID path string true "Order ID"
// @Success 200 {object} models.Order
// @Router /orders/{orderID} [get]
func GetOrder() gin.HandlerFunc {
	return func(c *gin.Context) {
		orderID, ok := parsePathID(c, "orderID")
		if !ok {
			return
		}
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetOrderByIDAndUser(ctx, sqlc.GetOrderByIDAndUserParams{ID: orderID, UserID: userID})
		if handleNotFound(c, err, "Order not found", "Failed to fetch order") {
			return
		}
		utils.Success(c, store.LoadOrder(ctx, q, row))
	}
}

// UpdateOrderStatus godoc
// @Summary Update order status (vendor)
// @Description Vendor updates fulfillment status for an order.
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param orderID path string true "Order ID"
// @Param status body models.UpdateOrderStatusRequest true "New status"
// @Success 200 {object} models.Order
// @Router /vendor/orders/{orderID}/status [put]
func UpdateOrderStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		orderID, ok := parsePathID(c, "orderID")
		if !ok {
			return
		}
		var req models.UpdateOrderStatusRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()

		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		items, err := q.ListOrderItemsByOrder(ctx, orderID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to verify order access")
			return
		}
		ownsOrder := false
		for _, item := range items {
			if item.VendorID == vendorID {
				ownsOrder = true
				break
			}
		}
		if !ownsOrder {
			utils.Error(c, http.StatusForbidden, "You cannot update this order")
			return
		}

		if _, err := q.GetOrderByID(ctx, orderID); handleNotFound(c, err, "Order not found", "Failed to fetch order") {
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
		if err := q.SetOrderUpdatedAt(ctx, sqlc.SetOrderUpdatedAtParams{
			UpdatedAt: utils.Now(),
			ID:        orderID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update order timestamp")
			return
		}

		updated, err := q.GetOrderByID(ctx, orderID)
		if handleNotFound(c, err, "Order not found", "Failed to fetch order") {
			return
		}
		utils.Success(c, store.LoadOrder(ctx, q, updated))
	}
}

// GetVendorOrders godoc
// @Summary List vendor orders
// @Description Returns paginated orders containing items from the signed-in vendor.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /vendor/orders [get]
func GetVendorOrders() gin.HandlerFunc {
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
		respondPaginated(c, store.LoadOrders(ctx, q, rows), total, page, limit)
	}
}

// GetAllOrders godoc
// @Summary List all orders (admin)
// @Description Returns paginated orders across the platform.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /admin/orders [get]
func GetAllOrders() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		st := getStore(c)
		q := st.Queries()
		page, limit, offset := pagination(c, 1, 10)

		total, err := q.CountAllOrders(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to count orders")
			return
		}

		all, err := q.ListAllOrders(ctx, sqlc.ListAllOrdersParams{
			Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch orders")
			return
		}
		respondPaginated(c, store.LoadOrders(ctx, q, all), total, page, limit)
	}
}

// AdminUpdateOrderStatus godoc
// @Summary Update order status (admin)
// @Description Marketplace policy: fulfillment status is updated by vendors, not admins.
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param orderID path string true "Order ID"
// @Param status body models.UpdateOrderStatusRequest true "New status"
// @Success 200 {object} models.Order
// @Router /admin/orders/{orderID}/status [put]
func AdminUpdateOrderStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		utils.Error(c, http.StatusForbidden, "Order fulfillment is managed by vendors. Admins can view orders but cannot change status.")
	}
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
