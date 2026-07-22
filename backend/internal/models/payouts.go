package models

type VendorPayoutMethodResponse struct {
	ID                  string  `json:"id"`
	Type                string  `json:"type"`
	AccountName         string  `json:"accountName"`
	Phone               string  `json:"phone,omitempty"`
	BankAccountNumber   string  `json:"bankAccountNumber,omitempty"`
	BankRoutingNumber   string  `json:"bankRoutingNumber,omitempty"`
	BankName            string  `json:"bankName,omitempty"`
	BankCurrency        string  `json:"bankCurrency,omitempty"`
	IsDefault           bool    `json:"isDefault"`
}

type CreateMpesaPayoutMethodRequest struct {
	AccountName string `json:"accountName" binding:"required"`
	Phone       string `json:"phone" binding:"required"`
	IsDefault   bool   `json:"isDefault"`
}

type CreateBankTransferPayoutMethodRequest struct {
	AccountName       string `json:"accountName" binding:"required"`
	BankAccountNumber string `json:"bankAccountNumber" binding:"required"`
	BankRoutingNumber string `json:"bankRoutingNumber" binding:"required"`
	BankName          string `json:"bankName" binding:"required"`
	BankCurrency      string `json:"bankCurrency" binding:"required"`
	IsDefault         bool   `json:"isDefault"`
}

type UpdateBankTransferPayoutMethodRequest struct {
	AccountName       string `json:"accountName" binding:"required"`
	BankAccountNumber string `json:"bankAccountNumber" binding:"required"`
	BankRoutingNumber string `json:"bankRoutingNumber" binding:"required"`
	BankName          string `json:"bankName" binding:"required"`
	BankCurrency      string `json:"bankCurrency" binding:"required"`
	IsDefault         bool   `json:"isDefault"`
}

type DeletePayoutMethodRequest struct {
	MethodID string `json:"methodId" binding:"required"`
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
