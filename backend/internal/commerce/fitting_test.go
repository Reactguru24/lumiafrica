package commerce

import "testing"

func TestSupportsAISizeFitting(t *testing.T) {
	tests := []struct {
		category    string
		subcategory string
		want        bool
	}{
		{"men", "shirts", true},
		{"women", "dresses", true},
		{"kids", "boys", true},
		{"footwear", "sneakers", false},
		{"accessories", "belts", false},
		{"accessories", "bags", false},
		{"men", "belts", false},
		{"", "shirts", false},
		{"MEN", "SHIRTS", true},
	}
	for _, tt := range tests {
		got := SupportsAISizeFitting(tt.category, tt.subcategory)
		if got != tt.want {
			t.Errorf("SupportsAISizeFitting(%q, %q) = %v, want %v", tt.category, tt.subcategory, got, tt.want)
		}
	}
}
