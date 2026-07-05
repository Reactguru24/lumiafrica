package seeder

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
)

const dbRetryAttempts = 4

func withDBRetry(ctx context.Context, db *database.DB, cfg *config.Config, fn func(q *sqlc.Queries) error) error {
	var last error
	for attempt := 1; attempt <= dbRetryAttempts; attempt++ {
		_ = db.EnsureConnected(ctx)
		last = fn(db.Q)
		if last == nil || !isConnError(last) {
			return last
		}
		log.Printf("Database error (attempt %d/%d): %v", attempt, dbRetryAttempts, last)
		if cfg != nil {
			if err := db.Reopen(cfg); err != nil {
				log.Printf("Database reopen failed: %v", err)
			}
		}
		time.Sleep(time.Duration(attempt) * 2 * time.Second)
	}
	return last
}

func isConnError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "invalid connection") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "broken pipe") ||
		strings.Contains(msg, "bad connection") ||
		strings.Contains(msg, "busy buffer") ||
		strings.Contains(msg, "unexpected eof")
}
