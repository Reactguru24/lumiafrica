package models

import (
	"time"
)

type FeaturedListingPlan string

const (
	PlanMonthly   FeaturedListingPlan = "monthly"
	PlanQuarterly FeaturedListingPlan = "quarterly"
	PlanBiannual  FeaturedListingPlan = "biannual"
	PlanYearly    FeaturedListingPlan = "yearly"
)

type VendorSubscription struct {
	ID            string              `json:"id"`
	VendorID      string              `json:"vendorId"`
	Plan          FeaturedListingPlan `json:"plan"`
	AmountPaid    float64             `json:"amountPaid"`
	PaymentMethod string              `json:"paymentMethod"`
	StartedAt     time.Time           `json:"startedAt"`
	ExpiresAt     time.Time           `json:"expiresAt"`
	Active        bool                `json:"active"`
	CreatedAt     time.Time           `json:"createdAt"`
	UpdatedAt     time.Time           `json:"updatedAt"`
}

type SubscriptionPlanConfig struct {
	ID             string   `json:"id"`
	Label          string   `json:"label"`
	Description    string   `json:"description"`
	PriceKES       float64  `json:"priceKes"`
	DurationMonths int      `json:"durationMonths"`
	FeaturedSlots  int      `json:"featuredSlots"`
	Benefits       []string `json:"benefits"`
}

type SubscribeRequest struct {
	Plan          FeaturedListingPlan `json:"plan" binding:"required"`
	PaymentMethod string              `json:"paymentMethod" binding:"required"`
}

type SubscriptionResponse struct {
	ID            string              `json:"id"`
	VendorID      string              `json:"vendorId"`
	Plan          FeaturedListingPlan `json:"plan"`
	PlanName      string              `json:"planName"`
	AmountPaid    float64             `json:"amountPaid"`
	PaymentMethod string              `json:"paymentMethod"`
	StartedAt     time.Time           `json:"startedAt"`
	ExpiresAt     time.Time           `json:"expiresAt"`
	Active        bool                `json:"active"`
	DaysLeft      int                 `json:"daysLeft"`
}

// Predefined subscription plans
var SubscriptionPlans = map[FeaturedListingPlan]SubscriptionPlanConfig{
	PlanMonthly: {
		ID:             "monthly",
		Label:          "Monthly",
		Description:    "1 month of featured listing",
		PriceKES:       2500,
		DurationMonths: 1,
		FeaturedSlots:  1,
		Benefits: []string{
			"Placement in the homepage Top Vendors carousel",
			"Direct link to your store from thousands of daily shoppers",
			"Ranked by sales among other featured vendors",
		},
	},
	PlanQuarterly: {
		ID:             "quarterly",
		Label:          "Quarterly",
		Description:    "3 months of featured listing",
		PriceKES:       6500,
		DurationMonths: 3,
		FeaturedSlots:  2,
		Benefits: []string{
			"Placement in the homepage Top Vendors carousel",
			"Direct link to your store from thousands of daily shoppers",
			"Ranked by sales among other featured vendors",
		},
	},
	PlanBiannual: {
		ID:             "biannual",
		Label:          "Bi-annual",
		Description:    "6 months of featured listing",
		PriceKES:       11000,
		DurationMonths: 6,
		FeaturedSlots:  3,
		Benefits: []string{
			"Placement in the homepage Top Vendors carousel",
			"Direct link to your store from thousands of daily shoppers",
			"Ranked by sales among other featured vendors",
		},
	},
	PlanYearly: {
		ID:             "yearly",
		Label:          "Yearly",
		Description:    "12 months of featured listing",
		PriceKES:       19000,
		DurationMonths: 12,
		FeaturedSlots:  5,
		Benefits: []string{
			"Placement in the homepage Top Vendors carousel",
			"Direct link to your store from thousands of daily shoppers",
			"Ranked by sales among other featured vendors",
		},
	},
}

// GetPlan retrieves a subscription plan configuration
func GetPlan(planID FeaturedListingPlan) *SubscriptionPlanConfig {
	if plan, ok := SubscriptionPlans[planID]; ok {
		return &plan
	}
	return nil
}
