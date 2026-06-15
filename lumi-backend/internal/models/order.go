package models

import (
	"time"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusShipped    OrderStatus = "shipped"
	OrderStatusDelivered  OrderStatus = "delivered"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

type OrderItem struct {
	ProductID    string  `json:"productId"`
	ProductName  string  `json:"productName"`
	ProductImage string  `json:"productImage"`
	VendorID     string  `json:"vendorId"`
	Price        float64 `json:"price"`
	Quantity     int     `json:"quantity"`
	Size         string  `json:"size"`
	Color        string  `json:"color"`
}

type Order struct {
	ID              string      `json:"id"`
	UserID          string      `json:"userId"`
	Items           []OrderItem `json:"items"`
	Subtotal        float64     `json:"subtotal"`
	ShippingCost    float64     `json:"shipping"`
	Total           float64     `json:"total"`
	PaymentMethod   string      `json:"paymentMethod"`
	Status          OrderStatus `json:"status"`
	DeliveryAddress string      `json:"deliveryAddress"`
	Notes           *string     `json:"notes"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
	DeliveredAt     *time.Time  `json:"deliveredAt"`
}

type CreateOrderRequest struct {
	Items           []OrderItem `json:"items" binding:"required"`
	PaymentMethod   string      `json:"paymentMethod" binding:"required"`
	DeliveryAddress string      `json:"deliveryAddress" binding:"required"`
	Notes           *string     `json:"notes"`
}

type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" binding:"required"`
}

type CreateReviewRequest struct {
	ProductID string `json:"productId" binding:"required"`
	OrderID   string `json:"orderId" binding:"required"`
	Rating    int    `json:"rating" binding:"required,min=1,max=5"`
	Comment   string `json:"comment" binding:"required,min=10"`
}

// ReplyToReviewRequest vendor review reply request.
type ReplyToReviewRequest struct {
	Reply string `json:"reply" binding:"required"`
}

type Review struct {
	ID            string     `json:"id"`
	ProductID     string     `json:"productId"`
	VendorID      string     `json:"vendorId"`
	UserID        string     `json:"userId"`
	OrderID       string     `json:"orderId"`
	Rating        int        `json:"rating"`
	Comment       string     `json:"comment"`
	VendorReply   *string    `json:"vendorReply,omitempty"`
	VendorReplyAt *time.Time `json:"vendorReplyAt,omitempty"`
	ProductName   string     `json:"productName,omitempty"`
	ProductImage  string     `json:"productImage,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}


