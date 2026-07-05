package handlers

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
)

type credentialFieldResult struct {
	Available bool   `json:"available"`
	Message   string `json:"message,omitempty"`
}

func normalizePhone(phone string) string {
	return strings.TrimSpace(phone)
}

func isDuplicateUserError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "duplicate entry")
}

func duplicateCredentialMessage(err error) string {
	if err == nil {
		return "Failed to create user"
	}
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "uq_email"), strings.Contains(msg, "email"):
		return "Email already registered"
	case strings.Contains(msg, "uq_phone"), strings.Contains(msg, "phone"):
		return "Phone number already registered"
	default:
		return "Email or phone number is already registered"
	}
}

func checkRegistrationEmail(ctx context.Context, q *sqlc.Queries, email string) credentialFieldResult {
	email = normalizeEmail(email)
	if email == "" {
		return credentialFieldResult{Available: false, Message: "Email is required"}
	}

	pending, err := isPendingBusinessEmail(ctx, q, email)
	if err != nil {
		return credentialFieldResult{Available: false, Message: "Unable to verify email"}
	}
	if pending {
		return credentialFieldResult{Available: false, Message: errApplicationUnderReviewForEmail(email)}
	}

	if _, err := q.GetUserByEmail(ctx, email); err == nil {
		return credentialFieldResult{Available: false, Message: "Email already registered"}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return credentialFieldResult{Available: false, Message: "Unable to verify email"}
	}

	return credentialFieldResult{Available: true}
}

func checkRegistrationPhone(ctx context.Context, q *sqlc.Queries, phone string, excludeUserID types.BinaryUUID) credentialFieldResult {
	phone = normalizePhone(phone)
	if phone == "" {
		return credentialFieldResult{Available: false, Message: "Phone number is required"}
	}

	existing, err := q.GetUserByPhone(ctx, phone)
	if err == nil {
		if !excludeUserID.IsZero() && existing.ID == excludeUserID {
			return credentialFieldResult{Available: true}
		}
		return credentialFieldResult{Available: false, Message: "Phone number already registered"}
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return credentialFieldResult{Available: false, Message: "Unable to verify phone number"}
	}

	return credentialFieldResult{Available: true}
}

func checkVendorBusinessEmail(ctx context.Context, q *sqlc.Queries, email string) credentialFieldResult {
	email = normalizeEmail(email)
	if email == "" {
		return credentialFieldResult{Available: false, Message: "Business email is required"}
	}

	if _, err := q.GetPendingApplicationByBusinessEmail(ctx, email); err == nil {
		return credentialFieldResult{Available: false, Message: errApplicationUnderReviewForEmail(email)}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return credentialFieldResult{Available: false, Message: "Unable to verify business email"}
	}

	existing, err := q.GetUserByEmail(ctx, email)
	if err == nil {
		if existing.Role == sqlc.UsersRoleVENDOR {
			return credentialFieldResult{Available: false, Message: "This email already has a vendor account"}
		}
		return credentialFieldResult{Available: false, Message: "This email is already registered. Use a different business email for your application."}
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return credentialFieldResult{Available: false, Message: "Unable to verify business email"}
	}

	return credentialFieldResult{Available: true}
}

func checkVendorContactPhone(ctx context.Context, q *sqlc.Queries, phone, businessEmail string) credentialFieldResult {
	phone = normalizePhone(phone)
	if phone == "" {
		return credentialFieldResult{Available: false, Message: "Contact phone is required"}
	}

	existing, err := q.GetUserByPhone(ctx, phone)
	if errors.Is(err, sql.ErrNoRows) {
		return credentialFieldResult{Available: true}
	}
	if err != nil {
		return credentialFieldResult{Available: false, Message: "Unable to verify phone number"}
	}
	if normalizeEmail(existing.Email) == normalizeEmail(businessEmail) {
		return credentialFieldResult{Available: true}
	}

	return credentialFieldResult{Available: false, Message: "This phone number is already registered to another account"}
}
