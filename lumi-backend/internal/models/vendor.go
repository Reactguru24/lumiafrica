package models

import (
	"time"
)

type VendorApplicationStatus string

const (
	AppStatusPending  VendorApplicationStatus = "pending"
	AppStatusApproved VendorApplicationStatus = "approved"
	AppStatusRejected VendorApplicationStatus = "rejected"
)

type Vendor struct {
	ID            string      `json:"id"`
	UserID        string      `json:"userId"`
	StoreName     string      `json:"storeName"`
	Slug          string      `json:"slug"`
	Description   string      `json:"description"`
	Logo          string      `json:"logo"`
	Banner        string      `json:"banner"`
	ContactPhone  string      `json:"contactPhone"`
	BusinessEmail string      `json:"businessEmail"`
	Country       string      `json:"country"`
	City          string      `json:"city"`
	SocialLinks   MapType     `json:"socialLinks"`
	Categories    StringArray `json:"categories"`
	Rating        float64     `json:"rating"`
	TotalSales    float64     `json:"totalSales"`
	ProductCount  int         `json:"productCount"`
	Suspended     bool        `json:"suspended"`
	IsFeatured    bool        `json:"isFeatured"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

type SetVendorFeaturedRequest struct {
	Featured bool `json:"featured" binding:"required"`
}

type VendorApplication struct {
	ID                  string                  `json:"id"`
	UserID              string                  `json:"userId"`
	StoreName           string                  `json:"storeName"`
	BusinessDescription string                  `json:"businessDescription"`
	Logo                string                  `json:"logo"`
	BusinessEmail       string                  `json:"businessEmail"`
	ContactPhone        string                  `json:"contactPhone"`
	Country             string                  `json:"country"`
	City                string                  `json:"city"`
	RegistrationNumber  string                  `json:"registrationNumber"`
	Categories          StringArray             `json:"categories"`
	RiskStatus          string                  `json:"riskStatus"`
	Status              VendorApplicationStatus `json:"status"`
	ReviewNote          *string                 `json:"reviewNote"`
	SubmittedAt         time.Time               `json:"submittedAt"`
	ReviewedAt          *time.Time              `json:"reviewedAt"`
	CreatedAt           time.Time               `json:"createdAt"`
	UpdatedAt           time.Time               `json:"updatedAt"`
}

type CreateVendorApplicationRequest struct {
	StoreName           string      `json:"storeName" binding:"required"`
	BusinessDescription string      `json:"businessDescription" binding:"required"`
	Logo                string      `json:"logo" binding:"required"`
	BusinessEmail       string      `json:"businessEmail" binding:"required,email"`
	ContactPhone        string      `json:"contactPhone" binding:"required"`
	Country             string      `json:"country" binding:"required"`
	City                string      `json:"city" binding:"required"`
	RegistrationNumber  string      `json:"registrationNumber" binding:"required"`
	Categories          StringArray `json:"categories" binding:"required"`
}

type ApproveVendorRequest struct {
	ReviewNote *string `json:"review_note"`
}

type RejectVendorRequest struct {
	ReviewNote string `json:"review_note" binding:"required"`
}

type UpdateVendorProfileRequest struct {
	StoreName     *string      `json:"storeName"`
	Description   *string      `json:"description"`
	Logo          *string      `json:"logo"`
	Banner        *string      `json:"banner"`
	ContactPhone  *string      `json:"contactPhone"`
	BusinessEmail *string      `json:"businessEmail"`
	SocialLinks   *MapType     `json:"socialLinks"`
	Categories    *StringArray `json:"categories"`
}

// MapType is a custom type for JSON objects
type MapType map[string]interface{}

func (m MapType) Value() (interface{}, error) {
	return m, nil
}
