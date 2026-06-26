package models

import (
	"math"
	"strconv"
	"time"
)

// VendorVerificationBadge maps average rating to tiers:
// 1, 1.5, 2, 2.5, 3, 3.5 (half-star steps), 4 (blue), 5 (gold).
func VendorVerificationBadge(rating float64) string {
	if rating <= 0 {
		return ""
	}
	if rating >= 4.75 {
		return "5"
	}
	if rating >= 4 {
		return "4"
	}

	tier := math.Floor(rating*2) / 2
	if tier < 1 {
		tier = 1
	}
	if tier > 3.5 {
		tier = 3.5
	}
	if tier == math.Trunc(tier) {
		return strconv.Itoa(int(tier))
	}
	return strconv.FormatFloat(tier, 'f', 1, 64)
}

type VendorApplicationStatus string

const (
	AppStatusPending  VendorApplicationStatus = "pending"
	AppStatusApproved VendorApplicationStatus = "approved"
	AppStatusRejected VendorApplicationStatus = "rejected"
)

type Vendor struct {
	ID                string      `json:"id"`
	UserID            string      `json:"userId"`
	StoreName         string      `json:"storeName"`
	Slug              string      `json:"slug"`
	Description       string      `json:"description"`
	Logo              string      `json:"logo"`
	Banner            string      `json:"banner"`
	ContactPhone      string      `json:"contactPhone"`
	BusinessEmail     string      `json:"businessEmail"`
	Country           string      `json:"country"`
	City              string      `json:"city"`
	SocialLinks       MapType     `json:"socialLinks"`
	Categories        StringArray `json:"categories"`
	Rating            float64     `json:"rating"`
	VerificationBadge string      `json:"verificationBadge,omitempty"`
	TotalSales        float64     `json:"totalSales"`
	ProductCount      int         `json:"productCount"`
	Suspended         bool        `json:"suspended"`
	IsFeatured        bool        `json:"isFeatured"`
	ActivationPending bool        `json:"activationPending,omitempty"`
	AccountDisabled   bool        `json:"accountDisabled,omitempty"`
	CreatedAt         time.Time   `json:"createdAt"`
	UpdatedAt         time.Time   `json:"updatedAt"`
}

type SetVendorFeaturedRequest struct {
	Featured *bool `json:"featured"`
}

type VendorApplication struct {
	ID                  string                  `json:"id"`
	UserID              string                  `json:"userId,omitempty"`
	ApplicantName       string                  `json:"applicantName"`
	StoreName           string                  `json:"storeName"`
	BusinessDescription string                  `json:"businessDescription"`
	Logo                string                  `json:"logo"`
	BusinessCertificate string                  `json:"businessCertificate"`
	VendorPhoto         string                  `json:"vendorPhoto"`
	BusinessPhoto       string                  `json:"businessPhoto"`
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
	ApplicantName       string      `json:"applicantName" binding:"required"`
	StoreName           string      `json:"storeName" binding:"required"`
	BusinessDescription string      `json:"businessDescription" binding:"required"`
	BusinessCertificate string      `json:"businessCertificate" binding:"required"`
	VendorPhoto         string      `json:"vendorPhoto" binding:"required"`
	BusinessPhoto       string      `json:"businessPhoto" binding:"required"`
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
	Country       *string      `json:"country"`
	City          *string      `json:"city"`
	SocialLinks   *MapType     `json:"socialLinks"`
	Categories    *StringArray `json:"categories"`
}

// MapType is a custom type for JSON objects
type MapType map[string]interface{}

func (m MapType) Value() (interface{}, error) {
	return m, nil
}
