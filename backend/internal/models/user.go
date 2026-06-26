package models

import (
	"database/sql/driver"
	"time"
)

type UserRole string

const (
	RoleCustomer UserRole = "CUSTOMER"
	RoleVendor   UserRole = "VENDOR"
	RoleAdmin    UserRole = "ADMIN"
)

// Scan implements the sql.Scanner interface
func (r *UserRole) Scan(value interface{}) error {
	*r = UserRole(value.([]byte))
	return nil
}

// Value implements the driver.Valuer interface
func (r UserRole) Value() (driver.Value, error) {
	return string(r), nil
}

type Address struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Label     string    `json:"label"`
	Street    string    `json:"street"`
	City      string    `json:"city"`
	State     string    `json:"state"`
	Country   string    `json:"country"`
	ZipCode   string    `json:"zipCode"`
	IsDefault bool      `json:"isDefault"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type User struct {
	ID        string    `json:"id"`
	FullName  string    `json:"fullName"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Password  string    `json:"-"`
	Role      UserRole  `json:"role"`
	Avatar    *string   `json:"avatar"`
	Disabled  bool      `json:"disabled"`
	PasswordSetAt *time.Time `json:"passwordSetAt,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Addresses []Address `json:"addresses"`
}

// LoginRequest represents login payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterRequest represents registration payload
type RegisterRequest struct {
	FullName string `json:"fullName" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

// UpdateProfileRequest represents profile update payload
type UpdateProfileRequest struct {
	FullName string  `json:"fullName"`
	Phone    string  `json:"phone"`
	Avatar   *string `json:"avatar"`
}

// AddAddressRequest represents add address payload
type AddAddressRequest struct {
	Label     string `json:"label" binding:"required"`
	Street    string `json:"street" binding:"required"`
	City      string `json:"city" binding:"required"`
	State     string `json:"state" binding:"required"`
	Country   string `json:"country" binding:"required"`
	ZipCode   string `json:"zipCode" binding:"required"`
	IsDefault bool   `json:"isDefault"`
}

// ForgotPasswordRequest represents forgot password payload
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents password reset payload
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

// ChangePasswordRequest represents authenticated password change payload
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// MeResponse is returned by GET /auth/me.
type MeResponse struct {
	User                     User                `json:"user"`
	PendingVendorApplication *VendorApplication  `json:"pendingVendorApplication"`
}

// Sanitize removes sensitive fields before sending in API responses.
func (u *User) Sanitize() {
	u.Password = ""
}
