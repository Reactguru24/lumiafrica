package models

import "time"

type DeliveryZoneResponse struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	BaseCost      float64 `json:"baseCost"`
	EstimatedDays string  `json:"estimatedDays"`
}

type CouponResponse struct {
	ID             string     `json:"id"`
	Code           string     `json:"code"`
	Type           string     `json:"type"`
	Value          float64    `json:"value"`
	MinOrderAmount float64    `json:"minOrderAmount"`
	MaxDiscount    *float64   `json:"maxDiscount,omitempty"`
	MaxUses        *int       `json:"maxUses,omitempty"`
	UsesCount      int        `json:"usesCount"`
	PerUserLimit   int        `json:"perUserLimit"`
	Active         bool       `json:"active"`
	StartsAt       *time.Time `json:"startsAt,omitempty"`
	ExpiresAt      *time.Time `json:"expiresAt,omitempty"`
}

type ValidateCouponRequest struct {
	Code     string  `json:"code" binding:"required"`
	Subtotal float64 `json:"subtotal" binding:"required,min=0"`
}

type ValidateCouponResponse struct {
	Valid          bool    `json:"valid"`
	Code           string  `json:"code,omitempty"`
	DiscountAmount float64 `json:"discountAmount"`
	Message        string  `json:"message,omitempty"`
}

type ShippingEstimateRequest struct {
	Items          []OrderItem `json:"items" binding:"required"`
	DeliveryZoneID string      `json:"deliveryZoneId" binding:"required"`
}

type VendorShippingBreakdown struct {
	VendorID     string  `json:"vendorId"`
	StoreName    string  `json:"storeName"`
	Subtotal     float64 `json:"subtotal"`
	ShippingCost float64 `json:"shippingCost"`
}

type ShippingEstimateResponse struct {
	ShippingCost float64                   `json:"shippingCost"`
	Breakdown    []VendorShippingBreakdown `json:"breakdown"`
	DeliveryZoneID string                  `json:"deliveryZoneId"`
}

type VendorShippingRateResponse struct {
	ZoneID        string  `json:"zoneId"`
	ZoneName      string  `json:"zoneName"`
	EstimatedDays string  `json:"estimatedDays"`
	Fee           float64 `json:"fee"`
}

type UpdateVendorShippingRatesRequest struct {
	Rates                 []VendorShippingRateInput `json:"rates" binding:"required"`
	FreeShippingThreshold *float64                  `json:"freeShippingThreshold"`
}

type VendorShippingRateInput struct {
	ZoneID string  `json:"zoneId" binding:"required"`
	Fee    float64 `json:"fee" binding:"min=0"`
}

type PromotionResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Type          string    `json:"type"`
	DiscountType  string    `json:"discountType"`
	DiscountValue float64   `json:"discountValue"`
	StartsAt      time.Time `json:"startsAt"`
	EndsAt        time.Time `json:"endsAt"`
	Active        bool      `json:"active"`
	Image         string    `json:"image,omitempty"`
	ProductIDs    []string  `json:"productIds,omitempty"`
}

type CollectionResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	Image       string    `json:"image,omitempty"`
	SortOrder   int       `json:"sortOrder"`
	Active      bool      `json:"active"`
	ProductIDs  []string  `json:"productIds,omitempty"`
	Products    []Product `json:"products,omitempty"`
}

type CreateCouponRequest struct {
	Code           string   `json:"code" binding:"required"`
	Type           string   `json:"type" binding:"required,oneof=percentage fixed"`
	Value          float64  `json:"value" binding:"required,gt=0"`
	MinOrderAmount float64  `json:"minOrderAmount"`
	MaxDiscount    *float64 `json:"maxDiscount"`
	MaxUses        *int     `json:"maxUses"`
	PerUserLimit   int      `json:"perUserLimit"`
	StartsAt       *string  `json:"startsAt"`
	ExpiresAt      *string  `json:"expiresAt"`
}

type UpdateCouponRequest struct {
	Code           string   `json:"code" binding:"required"`
	Type           string   `json:"type" binding:"required,oneof=percentage fixed"`
	Value          float64  `json:"value" binding:"required,gt=0"`
	MinOrderAmount float64  `json:"minOrderAmount"`
	MaxDiscount    *float64 `json:"maxDiscount"`
	MaxUses        *int     `json:"maxUses"`
	PerUserLimit   int      `json:"perUserLimit"`
	StartsAt       *string  `json:"startsAt"`
	ExpiresAt      *string  `json:"expiresAt"`
}

type CreatePromotionRequest struct {
	Name          string   `json:"name" binding:"required"`
	Type          string   `json:"type" binding:"required,oneof=flash_sale seasonal clearance"`
	DiscountType  string   `json:"discountType" binding:"required,oneof=percentage fixed"`
	DiscountValue float64  `json:"discountValue" binding:"required,gt=0"`
	StartsAt      string   `json:"startsAt" binding:"required"`
	EndsAt        string   `json:"endsAt" binding:"required"`
	ProductIDs    []string `json:"productIds"`
}

type CreateCollectionRequest struct {
	Name        string   `json:"name" binding:"required"`
	Slug        string   `json:"slug" binding:"required"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	SortOrder   int      `json:"sortOrder"`
	ProductIDs  []string `json:"productIds"`
}

type SetActiveRequest struct {
	Active bool `json:"active"`
}

type UpdatePromotionRequest struct {
	Name          string   `json:"name" binding:"required"`
	Type          string   `json:"type" binding:"required,oneof=flash_sale seasonal clearance"`
	DiscountType  string   `json:"discountType" binding:"required,oneof=percentage fixed"`
	DiscountValue float64  `json:"discountValue" binding:"required,gt=0"`
	StartsAt      string   `json:"startsAt" binding:"required"`
	EndsAt        string   `json:"endsAt" binding:"required"`
	ProductIDs    []string `json:"productIds"`
}

type UpdateCollectionRequest struct {
	Name        string   `json:"name" binding:"required"`
	Slug        string   `json:"slug" binding:"required"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	SortOrder   int      `json:"sortOrder"`
	ProductIDs  []string `json:"productIds"`
}
