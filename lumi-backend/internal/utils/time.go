package utils

import "time"

// Now returns current time in UTC
func Now() time.Time {
	return time.Now().UTC()
}

// ParsePeriod returns the start date for analytics period filters.
// Supported values: 7days, 30days (default), 90days, all.
func ParsePeriod(period string) time.Time {
	now := time.Now()
	switch period {
	case "7days":
		return now.AddDate(0, 0, -7)
	case "90days":
		return now.AddDate(0, -3, 0)
	case "all":
		return time.Time{}
	default:
		return now.AddDate(0, -1, 0)
	}
}
