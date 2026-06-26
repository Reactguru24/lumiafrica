package plans

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"lumi-backend/internal/config"
	"lumi-backend/internal/models"
	"lumi-backend/internal/paystack"
)

type planMeta struct {
	FeaturedSlots int      `json:"featuredSlots"`
	Benefits      []string `json:"benefits"`
}

var (
	cacheMu   sync.RWMutex
	cached    map[string]models.SubscriptionPlanConfig
	cachedAt  time.Time
	cacheTTL  = 5 * time.Minute
)

// ListFromPaystack loads plans from the Paystack dashboard (cached).
func ListFromPaystack(cfg *config.Config) (map[string]models.SubscriptionPlanConfig, error) {
	cacheMu.RLock()
	if cached != nil && time.Since(cachedAt) < cacheTTL {
		out := cached
		cacheMu.RUnlock()
		return out, nil
	}
	cacheMu.RUnlock()

	if cfg.PaystackSecretKey == "" {
		return legacyPlansMap(), nil
	}

	rows, err := paystack.NewClient(cfg.PaystackSecretKey).ListPlans()
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return map[string]models.SubscriptionPlanConfig{}, nil
	}

	out := make(map[string]models.SubscriptionPlanConfig, len(rows))
	for _, row := range rows {
		if row.PlanCode == "" {
			continue
		}
		meta := parsePlanDescription(row.Description)
		months := paystack.PlanDurationMonths(row.Interval, row.IntervalCount)
		slots := meta.FeaturedSlots
		if slots <= 0 {
			slots = defaultFeaturedSlots(months)
		}
		benefits := meta.Benefits
		if len(benefits) == 0 {
			benefits = defaultBenefits()
		}
		out[row.PlanCode] = models.SubscriptionPlanConfig{
			ID:             row.PlanCode,
			Label:          row.Name,
			Description:    plainDescription(row.Description),
			PriceKES:       paystack.PlanAmountKES(row.Amount),
			DurationMonths: months,
			FeaturedSlots:  slots,
			Benefits:       benefits,
		}
	}

	cacheMu.Lock()
	cached = out
	cachedAt = time.Now()
	cacheMu.Unlock()
	return out, nil
}

// Get resolves a plan by Paystack plan_code.
func Get(cfg *config.Config, planCode string) (*models.SubscriptionPlanConfig, error) {
	all, err := ListFromPaystack(cfg)
	if err != nil {
		return nil, err
	}
	if plan, ok := all[planCode]; ok {
		return &plan, nil
	}
	// Legacy enum slugs still supported for seeded data.
	if plan := models.GetPlan(models.FeaturedListingPlan(planCode)); plan != nil {
		return plan, nil
	}
	return nil, fmt.Errorf("unknown subscription plan: %s", planCode)
}

func parsePlanDescription(description string) planMeta {
	description = strings.TrimSpace(description)
	if description == "" {
		return planMeta{}
	}
	var meta planMeta
	if err := json.Unmarshal([]byte(description), &meta); err == nil {
		return meta
	}
	return planMeta{}
}

func plainDescription(description string) string {
	description = strings.TrimSpace(description)
	if description == "" {
		return "Featured vendor listing"
	}
	var meta planMeta
	if err := json.Unmarshal([]byte(description), &meta); err == nil {
		return "Featured vendor listing"
	}
	return description
}

func defaultFeaturedSlots(months int) int {
	switch {
	case months <= 1:
		return 1
	case months <= 3:
		return 2
	case months <= 6:
		return 3
	default:
		return 5
	}
}

func defaultBenefits() []string {
	return []string{
		"Placement in the homepage Top Vendors carousel",
		"Direct link to your store from daily shoppers",
		"Ranked by sales among other featured vendors",
	}
}

func legacyPlansMap() map[string]models.SubscriptionPlanConfig {
	out := make(map[string]models.SubscriptionPlanConfig, len(models.SubscriptionPlans))
	for k, v := range models.SubscriptionPlans {
		out[string(k)] = v
	}
	return out
}
