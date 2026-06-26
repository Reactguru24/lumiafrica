package paystack

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const apiBase = "https://api.paystack.co"

type Client struct {
	secretKey string
	http      *http.Client
}

func NewClient(secretKey string) *Client {
	return &Client{
		secretKey: secretKey,
		http:      &http.Client{},
	}
}

type InitializeRequest struct {
	Email       string                 `json:"email"`
	Amount      int64                  `json:"amount"`
	Reference   string                 `json:"reference"`
	Currency    string                 `json:"currency"`
	CallbackURL string                 `json:"callback_url,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Channels    []string               `json:"channels,omitempty"`
}

type InitializeData struct {
	AuthorizationURL string `json:"authorization_url"`
	AccessCode       string `json:"access_code"`
	Reference        string `json:"reference"`
}

type InitializeResponse struct {
	Status  bool           `json:"status"`
	Message string         `json:"message"`
	Data    InitializeData `json:"data"`
}

type VerifyData struct {
	Status    string `json:"status"`
	Reference string `json:"reference"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
}

type VerifyResponse struct {
	Status  bool       `json:"status"`
	Message string     `json:"message"`
	Data    VerifyData `json:"data"`
}

type WebhookEvent struct {
	Event string `json:"event"`
	Data  struct {
		Reference string `json:"reference"`
		Status    string `json:"status"`
		Amount    int64  `json:"amount"`
		Currency  string `json:"currency"`
		Metadata  struct {
			PaymentID string `json:"payment_id"`
			Type      string `json:"type"`
		} `json:"metadata"`
	} `json:"data"`
}

func (c *Client) Initialize(req InitializeRequest) (*InitializeData, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, apiBase+"/transaction/initialize", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("paystack initialize failed: %s", string(respBody))
	}

	var parsed InitializeResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack initialize failed: %s", parsed.Message)
	}
	return &parsed.Data, nil
}

type RefundRequest struct {
	Transaction  string `json:"transaction"`
	MerchantNote string `json:"merchant_note,omitempty"`
	CustomerNote string `json:"customer_note,omitempty"`
}

type RefundData struct {
	Transaction struct {
		Reference string `json:"reference"`
	} `json:"transaction"`
	Amount   int64  `json:"amount"`
	Currency string `json:"currency"`
	Status   string `json:"status"`
}

type RefundResponse struct {
	Status  bool       `json:"status"`
	Message string     `json:"message"`
	Data    RefundData `json:"data"`
}

func (c *Client) Refund(reference, reason string) (*RefundData, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}
	if reference == "" {
		return nil, fmt.Errorf("payment reference is required")
	}

	req := RefundRequest{
		Transaction:  reference,
		MerchantNote: reason,
		CustomerNote: "Your order could not be completed. A full refund has been issued.",
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, apiBase+"/refund", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("paystack refund failed: %s", string(respBody))
	}

	var parsed RefundResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack refund failed: %s", parsed.Message)
	}
	return &parsed.Data, nil
}

func (c *Client) Verify(reference string) (*VerifyData, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}

	httpReq, err := http.NewRequest(http.MethodGet, apiBase+"/transaction/verify/"+reference, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("paystack verify failed: %s", string(respBody))
	}

	var parsed VerifyResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack verify failed: %s", parsed.Message)
	}
	return &parsed.Data, nil
}

func VerifySignature(payload []byte, signature, secret string) bool {
	if signature == "" || secret == "" {
		return false
	}
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(expected)), []byte(strings.ToLower(signature)))
}

func AmountToKobo(amount float64) int64 {
	return int64(amount * 100)
}
