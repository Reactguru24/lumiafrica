package handlers

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"lumi-backend/internal/database/sqlc"
)

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func errApplicationUnderReviewForEmail(email string) string {
	return "A vendor application with " + email + " is under review. You cannot register, sign in, or reset a password for this email until the application is decided."
}

func isPendingBusinessEmail(ctx context.Context, q *sqlc.Queries, email string) (bool, error) {
	_, err := q.GetPendingApplicationByBusinessEmail(ctx, normalizeEmail(email))
	if err == nil {
		return true, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return false, err
}
