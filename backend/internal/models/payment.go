package models

type PaymentType string

const (
	PaymentTypeOrder        PaymentType = "order"
	PaymentTypeSubscription PaymentType = "subscription"
)

type PaymentStatus string

const (
	PaymentStatusPending  PaymentStatus = "pending"
	PaymentStatusSuccess  PaymentStatus = "success"
	PaymentStatusFailed   PaymentStatus = "failed"
	PaymentStatusRefunded PaymentStatus = "refunded"
)

type PaymentInitializeResponse struct {
	AuthorizationURL string `json:"authorizationUrl"`
	AccessCode       string `json:"accessCode"`
	Reference        string `json:"reference"`
}

type PaymentVerifyResponse struct {
	Status         PaymentStatus `json:"status"`
	Type           PaymentType   `json:"type"`
	Reference      string        `json:"reference"`
	OrderID        string        `json:"orderId,omitempty"`
	SubscriptionID string        `json:"subscriptionId,omitempty"`
	Message        string        `json:"message,omitempty"`
}

type OrderPaymentMetadata struct {
	Items           []OrderItem `json:"items"`
	PaymentMethod   string      `json:"paymentMethod"`
	DeliveryAddress string      `json:"deliveryAddress"`
	DeliveryCity    string      `json:"deliveryCity"`
	DeliveryZoneID  *string     `json:"deliveryZoneId,omitempty"`
	CouponCode      *string     `json:"couponCode,omitempty"`
	CouponID        *string     `json:"couponId,omitempty"`
	Notes           *string     `json:"notes"`
	Subtotal        float64     `json:"subtotal"`
	DiscountAmount  float64     `json:"discountAmount"`
	ShippingCost    float64     `json:"shippingCost"`
	TaxAmount       float64     `json:"taxAmount"`
	Total           float64     `json:"total"`
}

type SubscriptionPaymentMetadata struct {
	Plan          string   `json:"plan"` // Paystack plan_code
	PaymentMethod string   `json:"paymentMethod"`
	ProductIDs    []string `json:"productIds"`
}

type AdminFeaturedProductRow struct {
	Product    Product `json:"product"`
	VendorName string  `json:"vendorName"`
	VendorLogo string  `json:"vendorLogo"`
}

type AdminFeaturedListingResponse struct {
	Vendors       []Vendor                  `json:"vendors"`
	Products      []AdminFeaturedProductRow `json:"products"`
	TotalVendors  int64                     `json:"totalVendors"`
	TotalProducts int64                     `json:"totalProducts"`
	Page          int                       `json:"page"`
	Limit         int                       `json:"limit"`
}

type AdminSetProductFeaturedRequest struct {
	Featured *bool `json:"featured"`
}
