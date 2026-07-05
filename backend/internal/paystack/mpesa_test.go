package paystack

import "testing"

func TestNormalizeKenyaPhone(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"0712345678", "254712345678"},
		{"+254 712 345 678", "254712345678"},
		{"254712345678", "254712345678"},
		{"712345678", "254712345678"},
		{"0112345678", "254112345678"},
	}

	for _, tc := range tests {
		got, err := NormalizeKenyaPhone(tc.in)
		if err != nil {
			t.Fatalf("NormalizeKenyaPhone(%q) error: %v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("NormalizeKenyaPhone(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestMpesaAccountNumberForTransfer(t *testing.T) {
	got, err := MpesaAccountNumberForTransfer("254712345678")
	if err != nil {
		t.Fatal(err)
	}
	if got != "0712345678" {
		t.Fatalf("got %q, want 0712345678", got)
	}
}

func TestNormalizeKenyaPhoneRejectsInvalid(t *testing.T) {
	invalid := []string{"", "12345", "0812345678", "254812345678"}
	for _, in := range invalid {
		if _, err := NormalizeKenyaPhone(in); err == nil {
			t.Fatalf("expected error for %q", in)
		}
	}
}
