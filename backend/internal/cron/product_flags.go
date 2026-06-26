package cron

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
)

const productFlagRefreshLimit = 20

func StartProductFlagRefresh(ctx context.Context, q *sqlc.Queries) {
	go func() {
		if err := RefreshProductFlags(ctx, q); err != nil {
			log.Printf("Initial product flag refresh failed: %v", err)
		}

		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		var mu sync.Mutex
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				mu.Lock()
				if err := refreshProductFlags(ctx, q); err != nil {
					log.Printf("Product flag refresh failed: %v", err)
				}
				mu.Unlock()
			}
		}
	}()
}

func RefreshProductFlags(ctx context.Context, q *sqlc.Queries) error {
	return refreshProductFlags(ctx, q)
}

func refreshProductFlags(ctx context.Context, q *sqlc.Queries) error {
	if err := q.RefreshTrendingProducts(ctx); err != nil {
		return err
	}
	if err := q.RefreshNewArrivalProducts(ctx); err != nil {
		return err
	}
	if err := q.RefreshBestsellerProducts(ctx); err != nil {
		return err
	}
	return nil
}
