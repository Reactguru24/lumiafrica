package paystack

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type Plan struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	PlanCode      string `json:"plan_code"`
	Description   string `json:"description"`
	Amount        int64  `json:"amount"`
	Interval      string `json:"interval"`
	IntervalCount int    `json:"interval_count"`
	Currency      string `json:"currency"`
}

type listPlansResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    []Plan `json:"data"`
}

// ListPlans returns subscription plans created in the Paystack dashboard.
func (c *Client) ListPlans() ([]Plan, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("paystack secret key is not configured")
	}

	httpReq, err := http.NewRequest(http.MethodGet, apiBase+"/plan?perPage=50", nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("paystack list plans failed: %s", string(body))
	}

	var parsed listPlansResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack list plans failed: %s", parsed.Message)
	}
	return parsed.Data, nil
}

// PlanAmountKES converts Paystack amount (kobo) to KES.
func PlanAmountKES(amount int64) float64 {
	return float64(amount) / 100
}

// PlanDurationMonths estimates billing period length from Paystack interval fields.
func PlanDurationMonths(interval string, count int) int {
	if count <= 0 {
		count = 1
	}
	switch strings.ToLower(interval) {
	case "daily":
		return 1
	case "weekly":
		return 1
	case "monthly":
		return count
	case "quarterly":
		return 3 * count
	case "biannually":
		return 6 * count
	case "annually":
		return 12 * count
	default:
		return count
	}
}
