package models

type VendorPayoutMethodResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	AccountName string `json:"accountName"`
	Phone       string `json:"phone"`
	IsDefault   bool   `json:"isDefault"`
}

type CreateMpesaPayoutMethodRequest struct {
	AccountName string `json:"accountName" binding:"required"`
	Phone       string `json:"phone" binding:"required"`
	IsDefault   bool   `json:"isDefault"`
}

type VendorPayoutBalanceResponse struct {
	AvailableBalance float64 `json:"availableBalance"`
	Currency         string  `json:"currency"`
	MinimumWithdraw  float64 `json:"minimumWithdraw"`
}

type VendorPayoutResponse struct {
	ID          string  `json:"id"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Status      string  `json:"status"`
	Reference   string  `json:"reference,omitempty"`
	PeriodStart string  `json:"periodStart"`
	PeriodEnd   string  `json:"periodEnd"`
	CreatedAt   string  `json:"createdAt"`
	CompletedAt string  `json:"completedAt,omitempty"`
}

type RequestVendorWithdrawalRequest struct {
	Amount *float64 `json:"amount"`
}

type RequestVendorWithdrawalResponse struct {
	Payout VendorPayoutResponse `json:"payout"`
}
