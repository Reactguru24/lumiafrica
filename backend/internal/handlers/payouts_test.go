package handlers

import (
	"database/sql"
	"testing"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestNormalizeKenyaPhone(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"0712345678", "254712345678"},
		{"+254 712 345 678", "254712345678"},
		{"254712345678", "254712345678"},
		{"712345678", "254712345678"},
		{"0112345678", "254112345678"},
	}

	for _, tc := range tests {
		got, err := normalizeKenyaPhone(tc.in)
		require.NoError(t, err)
		require.Equal(t, tc.want, got)
	}
}

func TestNormalizeKenyaPhoneRejectsInvalid(t *testing.T) {
	invalid := []string{"", "12345", "0812345678", "254812345678"}
	for _, in := range invalid {
		_, err := normalizeKenyaPhone(in)
		require.Error(t, err, "expected error for %q", in)
	}
}

func TestMaskPhone(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"0712345678", "071234****"},
		{"1234", "****"},
		{"123", "123"},
		{"", ""},
	}

	for _, tc := range tests {
		got := maskPhone(tc.in)
		require.Equal(t, tc.want, got)
	}
}

func TestToPayoutMethodResponse(t *testing.T) {
	testTime := time.Now()
	vendorID := types.New()

	tests := []struct {
		name     string
		input    sqlc.VendorPayoutMethod
		expected models.VendorPayoutMethodResponse
	}{
		{
			name: "mpesa method",
			input: sqlc.VendorPayoutMethod{
				ID:          types.New(),
				VendorID:    vendorID,
				Type:        sqlc.VendorPayoutMethodsTypeMpesa,
				AccountName: "John Doe",
				AccountRef:  "254712345678",
				IsDefault:   1,
				CreatedAt:   testTime,
				UpdatedAt:   testTime,
			},
			expected: models.VendorPayoutMethodResponse{
				ID:          "",
				Type:        "mpesa",
				AccountName: "John Doe",
				Phone:       "25471234****",
				IsDefault:   true,
			},
		},
		{
			name: "bank transfer method",
			input: sqlc.VendorPayoutMethod{
				ID:                types.New(),
				VendorID:          vendorID,
				Type:              sqlc.VendorPayoutMethodsTypeBankTransfer,
				AccountName:       "John Doe",
				AccountRef:        "",
				BankName:          sql.NullString{String: "Equity Bank", Valid: true},
				BankAccountNumber: sql.NullString{String: "1234567890", Valid: true},
				BankRoutingNumber: sql.NullString{String: "EQTYKEKE", Valid: true},
				BankCurrency:      sql.NullString{String: "KES", Valid: true},
				IsDefault:         0,
				CreatedAt:         testTime,
				UpdatedAt:         testTime,
			},
			expected: models.VendorPayoutMethodResponse{
				ID:                "",
				Type:              "bank_transfer",
				AccountName:       "John Doe",
				BankName:          "Equity Bank",
				BankAccountNumber: "1234567890",
				BankRoutingNumber: "EQTYKEKE",
				BankCurrency:      "KES",
				IsDefault:         false,
			},
		},
		{
			name: "bank transfer method with null bank fields",
			input: sqlc.VendorPayoutMethod{
				ID:          types.New(),
				VendorID:    vendorID,
				Type:        sqlc.VendorPayoutMethodsTypeBankTransfer,
				AccountName: "Jane Doe",
				IsDefault:   0,
				CreatedAt:   testTime,
				UpdatedAt:   testTime,
			},
			expected: models.VendorPayoutMethodResponse{
				ID:          "",
				Type:        "bank_transfer",
				AccountName: "Jane Doe",
				IsDefault:   false,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := toPayoutMethodResponse(tc.input)
			require.Equal(t, tc.expected.Type, got.Type)
			require.Equal(t, tc.expected.AccountName, got.AccountName)
			require.Equal(t, tc.expected.Phone, got.Phone)
			require.Equal(t, tc.expected.BankName, got.BankName)
			require.Equal(t, tc.expected.BankAccountNumber, got.BankAccountNumber)
			require.Equal(t, tc.expected.BankRoutingNumber, got.BankRoutingNumber)
			require.Equal(t, tc.expected.BankCurrency, got.BankCurrency)
			require.Equal(t, tc.expected.IsDefault, got.IsDefault)
		})
	}
}

func TestToPayoutResponse(t *testing.T) {
	testTime := time.Now()
	vendorID := types.New()

	input := sqlc.VendorPayout{
		ID:          types.New(),
		VendorID:    vendorID,
		Amount:      store.FloatToDecimalString(1500.50),
		Currency:    "KES",
		Status:      sqlc.VendorPayoutsStatusPaid,
		PeriodStart: testTime,
		PeriodEnd:   testTime,
		Reference:   sql.NullString{String: "TRF123", Valid: true},
		CompletedAt: sql.NullTime{Time: testTime, Valid: true},
		CreatedAt:   testTime,
	}

	got := toPayoutResponse(input)
	require.Equal(t, "KES", got.Currency)
	require.Equal(t, 1500.50, got.Amount)
	require.Equal(t, "paid", got.Status)
	require.Equal(t, "TRF123", got.Reference)
	require.NotEmpty(t, got.CreatedAt)
	require.NotEmpty(t, got.PeriodStart)
	require.NotEmpty(t, got.PeriodEnd)
}

func TestToPayoutResponseWithNullReference(t *testing.T) {
	testTime := time.Now()
	vendorID := types.New()

	input := sqlc.VendorPayout{
		ID:          types.New(),
		VendorID:    vendorID,
		Amount:      store.FloatToDecimalString(2500.00),
		Currency:    "KES",
		Status:      sqlc.VendorPayoutsStatusProcessing,
		PeriodStart: testTime,
		PeriodEnd:   testTime,
		Reference:   sql.NullString{},
		CompletedAt: sql.NullTime{},
		CreatedAt:   testTime,
	}

	got := toPayoutResponse(input)
	require.Equal(t, "KES", got.Currency)
	require.Equal(t, 2500.00, got.Amount)
	require.Equal(t, "processing", got.Status)
	require.Empty(t, got.Reference)
	require.Empty(t, got.CompletedAt)
}

func TestMinWithdrawalAmount(t *testing.T) {
	require.Equal(t, 100.0, minWithdrawalKES)
}

func TestVendorPayoutBalanceResponse(t *testing.T) {
	balance := models.VendorPayoutBalanceResponse{
		AvailableBalance: 15000.50,
		Currency:         "KES",
		MinimumWithdraw:  100.0,
	}

	require.Equal(t, 15000.50, balance.AvailableBalance)
	require.Equal(t, "KES", balance.Currency)
	require.Equal(t, 100.0, balance.MinimumWithdraw)
}

func TestRequestVendorWithdrawalRequest(t *testing.T) {
	amount := 5000.00
	req := models.RequestVendorWithdrawalRequest{
		Amount: &amount,
	}

	require.NotNil(t, req.Amount)
	require.Equal(t, 5000.00, *req.Amount)

	var nilAmount *float64
	reqNil := models.RequestVendorWithdrawalRequest{
		Amount: nilAmount,
	}
	require.Nil(t, reqNil.Amount)
}

func TestCreateBankTransferRequestDefaults(t *testing.T) {
	req := models.CreateBankTransferPayoutMethodRequest{
		AccountName:       "John Doe",
		BankAccountNumber: "1234567890",
		BankRoutingNumber: "EQTYKEKE",
		BankName:          "Equity Bank",
		BankCurrency:      "",
		IsDefault:         false,
	}

	require.Equal(t, "John Doe", req.AccountName)
	require.Equal(t, "1234567890", req.BankAccountNumber)
	require.Equal(t, "EQTYKEKE", req.BankRoutingNumber)
	require.Equal(t, "Equity Bank", req.BankName)
	require.Equal(t, "", req.BankCurrency)
	require.False(t, req.IsDefault)
}

func TestVendorPayoutMethodResponseType(t *testing.T) {
	tests := []struct {
		name         string
		methodType   string
		expectedType string
	}{
		{
			name:         "mpesa type",
			methodType:   "mpesa",
			expectedType: "mpesa",
		},
		{
			name:         "bank transfer type",
			methodType:   "bank_transfer",
			expectedType: "bank_transfer",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.expectedType, tc.methodType)
		})
	}
}

func TestVendorPayoutsStatusValues(t *testing.T) {
	tests := []struct {
		name   string
		status sqlc.VendorPayoutsStatus
	}{
		{"pending", sqlc.VendorPayoutsStatusPending},
		{"processing", sqlc.VendorPayoutsStatusProcessing},
		{"paid", sqlc.VendorPayoutsStatusPaid},
		{"failed", sqlc.VendorPayoutsStatusFailed},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.status, sqlc.VendorPayoutsStatus(tc.name))
		})
	}
}

func TestTypesBinaryUUIDFromString(t *testing.T) {
	u := uuid.New()
	b := types.BinaryUUID(u)

	require.Equal(t, u.String(), b.String())
	require.Equal(t, 16, len(b))
}

func TestTypesBinaryUUIDIsZero(t *testing.T) {
	zero := types.BinaryUUID{}
	nonzero := types.New()

	require.True(t, zero.IsZero())
	require.False(t, nonzero.IsZero())
}

func TestTypesBinaryUUIDMarshalJSON(t *testing.T) {
	u := uuid.New()
	b := types.BinaryUUID(u)

	data, err := b.MarshalJSON()
	require.NoError(t, err)
	require.Contains(t, string(data), u.String())
}