package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type ProductStatus string

const (
	StatusActive   ProductStatus = "active"
	StatusPending  ProductStatus = "pending"
	StatusHidden   ProductStatus = "hidden"
	StatusArchived ProductStatus = "archived"
)

type Gender string

const (
	GenderMen    Gender = "men"
	GenderWomen  Gender = "women"
	GenderKids   Gender = "kids"
	GenderUnisex Gender = "unisex"
)

type Color struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

type Product struct {
	ID          string        `json:"id"`
	VendorID    string        `json:"vendorId"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Brand       string        `json:"brand"`
	Category    string        `json:"category"`
	Subcategory string        `json:"subcategory"`
	Gender      Gender        `json:"gender"`
	Price       float64       `json:"price"`
	Discount    float64       `json:"discount"`
	Images      StringArray   `json:"images"`
	Colors      ColorArray    `json:"colors"`
	Sizes       StringArray   `json:"sizes"`
	SKU         string        `json:"sku"`
	Stock       int           `json:"stock"`
	Rating      float64       `json:"rating"`
	ReviewCount int           `json:"reviewCount"`
	Status      ProductStatus `json:"status"`
	Featured    bool          `json:"featured"`
	Trending    bool          `json:"trending"`
	Bestseller  bool          `json:"bestseller"`
	NewArrival  bool          `json:"newArrival"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

// StringArray is a custom type for JSON arrays of strings
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *StringArray) Scan(value interface{}) error {
	return json.Unmarshal(value.([]byte), &a)
}

// ColorArray is a custom type for JSON arrays of colors
type ColorArray []Color

func (a ColorArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *ColorArray) Scan(value interface{}) error {
	return json.Unmarshal(value.([]byte), &a)
}

type CreateProductRequest struct {
	Name        string      `json:"name" binding:"required"`
	Description string      `json:"description" binding:"required"`
	Brand       string      `json:"brand" binding:"required"`
	Category    string      `json:"category" binding:"required"`
	Subcategory string      `json:"subcategory" binding:"required"`
	Gender      Gender      `json:"gender" binding:"required"`
	Price       float64     `json:"price" binding:"required,gt=0"`
	Discount    float64     `json:"discount"`
	Colors      ColorArray  `json:"colors"`
	Sizes       StringArray `json:"sizes" binding:"required"`
	SKU         string      `json:"sku" binding:"required"`
	Stock       int         `json:"stock" binding:"required,gte=0"`
	Images      StringArray `json:"images"`
}

type UpdateProductRequest struct {
	Name        *string      `json:"name"`
	Description *string      `json:"description"`
	Brand       *string      `json:"brand"`
	Category    *string      `json:"category"`
	Subcategory *string      `json:"subcategory"`
	Gender      *Gender      `json:"gender"`
	Price       *float64     `json:"price"`
	Discount    *float64     `json:"discount"`
	Colors      *ColorArray  `json:"colors"`
	Sizes       *StringArray `json:"sizes"`
	Stock       *int         `json:"stock"`
	Images      *StringArray `json:"images"`
}

type ModerateProductRequest struct {
	Status ProductStatus `json:"status" binding:"required"`
}

type ModerateProductDecisionRequest struct {
	Approved bool   `json:"approved" binding:"required"`
	Reason   string `json:"reason"`
}


