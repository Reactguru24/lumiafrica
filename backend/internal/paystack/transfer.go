package paystack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type TransferRecipientRequest struct {
	Type          string `json:"type"`
	Name          string `json:"name"`
	AccountNumber string `json:"account_number"`
	BankCode      string `json:"bank_code"`
	Currency      string `json:"currency"`
}

type TransferRecipientData struct {
	RecipientCode string `json:"recipient_code"`
}

type TransferRecipientResponse struct {
	Status  bool                  `json:"status"`
	Message string                `json:"message"`
	Data    TransferRecipientData `json:"data"`
}

type TransferRequest struct {
	Source    string `json:"source"`
	Amount    int64  `json:"amount"`
	Recipient string `json:"recipient"`
	Reason    string `json:"reason"`
	Currency  string `json:"currency"`
}

type TransferData struct {
	TransferCode string `json:"transfer_code"`
	Reference    string `json:"reference"`
	Status       string `json:"status"`
}

type TransferResponse struct {
	Status  bool         `json:"status"`
	Message string       `json:"message"`
	Data    TransferData `json:"data"`
}

func (c *Client) CreateTransferRecipient(req TransferRecipientRequest) (*TransferRecipientData, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, apiBase+"/transferrecipient", bytes.NewReader(body))
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
		return nil, fmt.Errorf("paystack transfer recipient failed: %s", string(respBody))
	}

	var parsed TransferRecipientResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack transfer recipient failed: %s", parsed.Message)
	}
	return &parsed.Data, nil
}

func (c *Client) InitiateTransfer(req TransferRequest) (*TransferData, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, apiBase+"/transfer", bytes.NewReader(body))
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
		return nil, fmt.Errorf("paystack transfer failed: %s", string(respBody))
	}

	var parsed TransferResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack transfer failed: %s", parsed.Message)
	}
	return &parsed.Data, nil
}
