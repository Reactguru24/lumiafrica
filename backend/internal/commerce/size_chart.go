package commerce

import (
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/models"
)

// Standard clothing size charts (chest/waist/hips in cm).
var sizeCharts = map[models.Gender]map[string]map[string]string{
	models.GenderMen: {
		"XS": {"chest": "81-86", "waist": "66-71", "hips": "81-86"},
		"S":  {"chest": "86-91", "waist": "71-76", "hips": "86-91"},
		"M":  {"chest": "91-97", "waist": "76-81", "hips": "91-97"},
		"L":  {"chest": "97-102", "waist": "81-86", "hips": "97-102"},
		"XL": {"chest": "102-107", "waist": "86-91", "hips": "102-107"},
		"XXL": {"chest": "107-112", "waist": "91-97", "hips": "107-112"},
	},
	models.GenderWomen: {
		"XS": {"chest": "76-81", "waist": "58-63", "hips": "81-86"},
		"S":  {"chest": "81-86", "waist": "63-68", "hips": "86-91"},
		"M":  {"chest": "86-91", "waist": "68-74", "hips": "91-97"},
		"L":  {"chest": "91-97", "waist": "74-79", "hips": "97-102"},
		"XL": {"chest": "97-102", "waist": "79-84", "hips": "102-107"},
		"XXL": {"chest": "102-107", "waist": "84-89", "hips": "107-112"},
	},
	models.GenderKids: {
		"2T":  {"chest": "53-56", "waist": "51-53", "hips": "56-58"},
		"3T":  {"chest": "56-58", "waist": "53-56", "hips": "58-61"},
		"4T":  {"chest": "58-61", "waist": "56-58", "hips": "61-64"},
		"5":   {"chest": "61-64", "waist": "58-61", "hips": "64-66"},
		"6":   {"chest": "64-66", "waist": "61-63", "hips": "66-69"},
		"7":   {"chest": "66-69", "waist": "63-66", "hips": "69-71"},
		"8":   {"chest": "69-71", "waist": "66-69", "hips": "71-74"},
		"10":  {"chest": "71-74", "waist": "69-71", "hips": "74-79"},
		"12":  {"chest": "74-79", "waist": "71-74", "hips": "79-84"},
	},
	models.GenderUnisex: {
		"XS": {"chest": "79-84", "waist": "64-69", "hips": "81-86"},
		"S":  {"chest": "84-89", "waist": "69-74", "hips": "86-91"},
		"M":  {"chest": "89-94", "waist": "74-79", "hips": "91-97"},
		"L":  {"chest": "94-99", "waist": "79-84", "hips": "97-102"},
		"XL": {"chest": "99-104", "waist": "84-89", "hips": "102-107"},
		"XXL": {"chest": "104-109", "waist": "89-94", "hips": "107-112"},
	},
}

// BuildProductSizeChart returns measurement ranges for the product's available sizes.
func BuildProductSizeChart(gender models.Gender, sizes []string) map[string]map[string]string {
	chart, ok := sizeCharts[gender]
	if !ok {
		chart = sizeCharts[models.GenderUnisex]
	}

	out := make(map[string]map[string]string)
	for _, size := range sizes {
		key := normalizeSizeKey(size)
		if ranges, found := chart[key]; found {
			out[size] = ranges
			continue
		}
		if ranges, found := chart[strings.ToUpper(key)]; found {
			out[size] = ranges
		}
	}
	return out
}

func normalizeSizeKey(size string) string {
	s := strings.TrimSpace(strings.ToUpper(size))
	switch s {
	case "XSMALL", "EXTRA SMALL":
		return "XS"
	case "SMALL":
		return "S"
	case "MEDIUM":
		return "M"
	case "LARGE":
		return "L"
	case "XLARGE", "EXTRA LARGE":
		return "XL"
	case "2XL", "XXLARGE":
		return "XXL"
	default:
		return s
	}
}
