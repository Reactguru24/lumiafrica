package paystack

import (
	"fmt"
	"strings"
	"unicode"
)

// NormalizeKenyaPhone canonicalizes Kenyan mobile numbers to 254XXXXXXXXX (12 digits).
func NormalizeKenyaPhone(phone string) (string, error) {
	digits := digitsOnly(phone)
	if digits == "" {
		return "", fmt.Errorf("enter a valid M-Pesa number (e.g. 0712345678)")
	}

	switch {
	case strings.HasPrefix(digits, "254") && len(digits) == 12:
		// already international
	case strings.HasPrefix(digits, "0") && len(digits) == 10:
		digits = "254" + digits[1:]
	case len(digits) == 9 && digits[0] == '7':
		digits = "254" + digits
	default:
		return "", fmt.Errorf("enter a valid M-Pesa number (e.g. 0712345678)")
	}

	if !isValidKenyaMobile(digits) {
		return "", fmt.Errorf("enter a valid Safaricom or Airtel M-Pesa number")
	}
	return digits, nil
}

// MpesaAccountNumberForTransfer formats a stored phone for Paystack transfer recipients.
// Paystack expects the local Kenyan format (07XXXXXXXX), not 254XXXXXXXXX.
func MpesaAccountNumberForTransfer(phone254 string) (string, error) {
	normalized, err := NormalizeKenyaPhone(phone254)
	if err != nil {
		return "", err
	}
	return "0" + normalized[3:], nil
}

func digitsOnly(phone string) string {
	var b strings.Builder
	for _, r := range phone {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func isValidKenyaMobile(phone254 string) bool {
	if len(phone254) != 12 || !strings.HasPrefix(phone254, "254") {
		return false
	}
	// Kenyan mobile numbers use 254 7XX… or 254 1XX… (e.g. 011x, 010x).
	switch phone254[3] {
	case '7', '1':
		return true
	default:
		return false
	}
}
