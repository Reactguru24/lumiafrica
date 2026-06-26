package models

type CartItemResponse struct {
	ProductID     string `json:"productId"`
	Quantity      int    `json:"quantity"`
	Size          string `json:"size"`
	Color         string `json:"color"`
	SavedForLater bool   `json:"savedForLater"`
}

type CartResponse struct {
	Items         []CartItemResponse `json:"items"`
	Wishlist      []string           `json:"wishlist"`
	GuestSessionID string            `json:"guestSessionId,omitempty"`
}

type UpsertCartItemRequest struct {
	ProductID string `json:"productId" binding:"required"`
	Size      string `json:"size" binding:"required"`
	Color     string `json:"color" binding:"required"`
	Quantity  int    `json:"quantity"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

type ToggleSaveForLaterRequest struct {
	SavedForLater bool `json:"savedForLater"`
}

type SetWishlistRequest struct {
	Active bool `json:"active"`
}

type UpdatePlatformCommissionRequest struct {
	CommissionRate    float64 `json:"commissionRate" binding:"required,min=0,max=100"`
	CommissionEnabled bool    `json:"commissionEnabled"`
}

type UpdateVendorCommissionRequest struct {
	CommissionRateOverride *float64 `json:"commissionRateOverride"`
}
