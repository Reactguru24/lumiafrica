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

const ProductFeaturedLimit = 10

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

type ProductVariant struct {
	Size  string `json:"size"`
	Color string `json:"color"`
	Stock int    `json:"stock"`
}

type Product struct {
	ID           string        `json:"id"`
	VendorID     string        `json:"vendorId"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Brand        string        `json:"brand"`
	Category     string        `json:"category"`
	Subcategory  string        `json:"subcategory"`
	Gender       Gender        `json:"gender"`
	Price        float64       `json:"price"`
	Discount     float64       `json:"discount"`
	Images       StringArray   `json:"images"`
	Colors       ColorArray    `json:"colors"`
	Sizes        StringArray   `json:"sizes"`
	SKU          string        `json:"sku"`
	Stock        int           `json:"stock"`
	VariantStock VariantArray  `json:"variantStock"`
	Rating       float64       `json:"rating"`
	ReviewCount  int           `json:"reviewCount"`
	Status       ProductStatus `json:"status"`
	Featured     bool          `json:"featured"`
	Trending     bool          `json:"trending"`
	Bestseller   bool          `json:"bestseller"`
	NewArrival   bool          `json:"newArrival"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
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

// VariantArray is a custom type for JSON arrays of size/color stock variants.
type VariantArray []ProductVariant

func (a VariantArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *VariantArray) Scan(value interface{}) error {
	if value == nil {
		*a = VariantArray{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), &a)
	}
	return json.Unmarshal(bytes, &a)
}

func TotalVariantStock(variants VariantArray) int {
	total := 0
	for _, variant := range variants {
		total += variant.Stock
	}
	return total
}

func BuildVariantMatrix(sizes StringArray, colors ColorArray, existing VariantArray) VariantArray {
	lookup := make(map[string]int, len(existing))
	for _, variant := range existing {
		lookup[variant.Size+"|"+variant.Color] = variant.Stock
	}
	matrix := make(VariantArray, 0, len(sizes)*len(colors))
	for _, size := range sizes {
		for _, color := range colors {
			key := size + "|" + color.Name
			matrix = append(matrix, ProductVariant{
				Size:  size,
				Color: color.Name,
				Stock: lookup[key],
			})
		}
	}
	return matrix
}

type CreateProductRequest struct {
	Name         string       `json:"name" binding:"required"`
	Description  string       `json:"description" binding:"required"`
	Brand        string       `json:"brand" binding:"required"`
	Category     string       `json:"category" binding:"required"`
	Subcategory  string       `json:"subcategory" binding:"required"`
	Gender       Gender       `json:"gender" binding:"required"`
	Price        float64      `json:"price" binding:"required,gt=0"`
	Discount     float64      `json:"discount"`
	Colors       ColorArray   `json:"colors"`
	Sizes        StringArray  `json:"sizes" binding:"required"`
	SKU          string       `json:"sku" binding:"required"`
	Stock        int          `json:"stock"`
	VariantStock VariantArray `json:"variantStock" binding:"required"`
	Images       StringArray  `json:"images"`
}

type UpdateProductRequest struct {
	Name         *string       `json:"name"`
	Description  *string       `json:"description"`
	Brand        *string       `json:"brand"`
	Category     *string       `json:"category"`
	Subcategory  *string       `json:"subcategory"`
	Gender       *Gender       `json:"gender"`
	Price        *float64      `json:"price"`
	Discount     *float64      `json:"discount"`
	Colors       *ColorArray   `json:"colors"`
	Sizes        *StringArray  `json:"sizes"`
	Stock        *int          `json:"stock"`
	VariantStock *VariantArray `json:"variantStock"`
	Images       *StringArray  `json:"images"`
}

type SetProductFeaturedRequest struct {
	Featured *bool `json:"featured" binding:"required"`
}

type ModerateProductRequest struct {
	Status ProductStatus `json:"status" binding:"required"`
}

type ModerateProductDecisionRequest struct {
	Approved bool   `json:"approved"`
	Archive  bool   `json:"archive"`
	Reason   string `json:"reason"`
}
