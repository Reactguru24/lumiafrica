package types

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// BinaryUUID maps a Go UUID to MySQL BINARY(16).
//
// Storage convention (no swap flag):
//   INSERT: UUID_TO_BIN(?)        — standard byte order
//   SELECT: BIN_TO_UUID(id)       — standard byte order
//
// The swap flag (UUID_TO_BIN(?, 1)) optimises B-tree locality for time-ordered
// UUIDs (v1, v7). This codebase uses random v4 UUIDs so no swap is needed;
// revisit if migrating to v7.
//
// Nullable columns are generated as *BinaryUUID when emit_pointers_for_null_types
// is enabled in sqlc.yaml — no separate NullBinaryUUID type is required.
type BinaryUUID [16]byte

// New returns a new random v4 BinaryUUID.
func New() BinaryUUID {
	return BinaryUUID(uuid.New())
}

// Parse parses a UUID string into a BinaryUUID.
func Parse(s string) (BinaryUUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return BinaryUUID{}, fmt.Errorf("types.Parse: %w", err)
	}
	return BinaryUUID(u), nil
}

// MustParse parses a UUID string and panics on error. Use only in tests or
// package-level var initialisation where the value is a known constant.
func MustParse(s string) BinaryUUID {
	b, err := Parse(s)
	if err != nil {
		panic(err)
	}
	return b
}

// String returns the canonical UUID string representation.
func (b BinaryUUID) String() string {
	return uuid.UUID(b).String()
}

// IsZero reports whether b is the zero UUID (all bytes zero).
func (b BinaryUUID) IsZero() bool {
	return b == BinaryUUID{}
}

// Value implements driver.Valuer — writes 16 raw bytes to MySQL.
func (b BinaryUUID) Value() (driver.Value, error) {
	return b[:], nil
}

// Scan implements sql.Scanner — reads 16 raw bytes from a MySQL BINARY(16) column.
func (b *BinaryUUID) Scan(src any) error {
	switch v := src.(type) {
	case []byte:
		if len(v) != 16 {
			return fmt.Errorf("BinaryUUID.Scan: expected 16 bytes, got %d", len(v))
		}
		copy(b[:], v)
		return nil
	case string:
		// Some MySQL driver configurations return binary columns as hex strings.
		u, err := uuid.Parse(v)
		if err != nil {
			return fmt.Errorf("BinaryUUID.Scan: %w", err)
		}
		*b = BinaryUUID(u)
		return nil
	case nil:
		return fmt.Errorf("BinaryUUID.Scan: cannot scan nil into non-pointer BinaryUUID")
	default:
		return fmt.Errorf("BinaryUUID.Scan: unsupported type %T", src)
	}
}

// MarshalJSON encodes the UUID as a quoted string, e.g. "123e4567-e89b-...".
// Without this, encoding/json would base64-encode the raw [16]byte.
func (b BinaryUUID) MarshalJSON() ([]byte, error) {
	return json.Marshal(b.String())
}

// UnmarshalJSON decodes a quoted UUID string.
func (b *BinaryUUID) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	parsed, err := Parse(s)
	if err != nil {
		return err
	}
	*b = parsed
	return nil
}
