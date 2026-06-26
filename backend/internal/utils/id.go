package utils

import (
	"lumi-backend/internal/database/types"

	"github.com/google/uuid"
)

// GenerateID returns a canonical UUID string for API responses.
func GenerateID() string {
	return types.New().String()
}

// GenerateBinaryID returns a new BinaryUUID for database writes.
func GenerateBinaryID() types.BinaryUUID {
	return types.New()
}

// ParseID parses a UUID string into BinaryUUID.
func ParseID(s string) (types.BinaryUUID, error) {
	return types.Parse(s)
}

// MustParseID parses a UUID string and panics on error.
func MustParseID(s string) types.BinaryUUID {
	return types.MustParse(s)
}

// IDFromString is an alias for ParseID for readability at call sites.
func IDFromString(s string) (types.BinaryUUID, error) {
	return types.Parse(s)
}

// GenerateIDWithPrefix generates a slug prefix with a short random suffix.
func GenerateIDWithPrefix(prefix string) string {
	return prefix + "-" + uuid.New().String()[:8]
}
