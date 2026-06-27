package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (m *Mailer) sendViaResend(to, subject, htmlBody string) error {
	apiKey := strings.TrimSpace(m.cfg.ResendAPIKey)
	if apiKey == "" {
		return fmt.Errorf("resend api key is not configured")
	}

	fromEmail := strings.TrimSpace(m.cfg.SMTPFromEmail)
	if fromEmail == "" {
		fromEmail = "onboarding@resend.dev"
	}
	fromName := strings.TrimSpace(m.cfg.SMTPFromName)
	if fromName == "" {
		fromName = "Lumi Africa"
	}

	payload := resendPayload{
		From:    fmt.Sprintf("%s <%s>", fromName, fromEmail),
		To:      []string{to},
		Subject: subject,
		HTML:    htmlBody,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend api %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}
