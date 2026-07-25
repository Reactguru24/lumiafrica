package handlers

import (
	"testing"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
)

func TestBuildAdminInvitePhoneUsesPlaceholderForEmptyInput(t *testing.T) {
	phone := buildAdminInvitePhone("")
	if phone == "" {
		t.Fatal("expected non-empty phone placeholder")
	}
	if len(phone) > 20 {
		t.Fatalf("expected phone to be 20 chars or fewer, got %d", len(phone))
	}
}

func TestBuildAdminInvitePhonePreservesProvidedPhone(t *testing.T) {
	const input = "+254712345678"
	got := buildAdminInvitePhone(input)
	if got != input {
		t.Fatalf("expected %q, got %q", input, got)
	}
}

func TestInferPrimaryUserRoleFromRBACRoleNames(t *testing.T) {
	tests := []struct {
		name  string
		input []string
		want  sqlc.UsersRole
	}{
		{name: "customer fallback", input: nil, want: sqlc.UsersRoleCUSTOMER},
		{name: "vendor role", input: []string{"vendor"}, want: sqlc.UsersRoleVENDOR},
		{name: "admin role", input: []string{"support-admin"}, want: sqlc.UsersRoleADMIN},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := inferPrimaryUserRoleFromRBACRoleNames(tt.input)
			if got != tt.want {
				t.Fatalf("expected %q, got %q", tt.want, got)
			}
		})
	}
}
