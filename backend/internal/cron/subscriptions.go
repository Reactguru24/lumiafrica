package cron

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
)

func StartSubscriptionExpiry(ctx context.Context, q *sqlc.Queries) {
	go func() {
		if err := expireSubscriptions(ctx, q); err != nil {
			log.Printf("Initial subscription expiry check failed: %v", err)
		}

		ticker := time.NewTicker(6 * time.Hour)
		defer ticker.Stop()

		var mu sync.Mutex
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				mu.Lock()
				if err := expireSubscriptions(ctx, q); err != nil {
					log.Printf("Subscription expiry check failed: %v", err)
				}
				mu.Unlock()
			}
		}
	}()
}

func expireSubscriptions(ctx context.Context, q *sqlc.Queries) error {
	rows, err := q.ListExpiredActiveSubscriptions(ctx)
	if err != nil {
		return err
	}
	for _, sub := range rows {
		if err := q.DeactivateSubscription(ctx, sub.ID); err != nil {
			return err
		}
		if err := q.UnfeatureVendorIfNoActiveSubscription(ctx, sub.VendorID); err != nil {
			return err
		}
		if err := q.ClearVendorFeaturedProducts(ctx, sub.VendorID); err != nil {
			return err
		}
	}
	return nil
}
