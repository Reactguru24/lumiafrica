package commerce

import "strings"

var clothingCategories = map[string]struct{}{
	"men":     {},
	"women":   {},
	"kids":    {},
}

var nonClothingSubcategories = map[string]struct{}{
	"bags":        {},
	"belts":       {},
	"caps":        {},
	"watches":     {},
	"sunglasses":  {},
	"sneakers":    {},
	"boots":       {},
	"sandals":     {},
	"heels":       {},
}

// SupportsAISizeFitting reports whether virtual body-size fitting applies (apparel only).
func SupportsAISizeFitting(category, subcategory string) bool {
	cat := strings.ToLower(strings.TrimSpace(category))
	sub := strings.ToLower(strings.TrimSpace(subcategory))

	if _, ok := clothingCategories[cat]; !ok {
		return false
	}
	if sub != "" {
		if _, blocked := nonClothingSubcategories[sub]; blocked {
			return false
		}
	}
	return true
}
