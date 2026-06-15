package utils

import (
	"github.com/google/uuid"
)

// GenerateID generates a UUID
func GenerateID() string {
	return uuid.New().String()
}

// GenerateIDWithPrefix generates a UUID with a prefix
func GenerateIDWithPrefix(prefix string) string {
	return prefix + "-" + uuid.New().String()[:8]
}
