package store

import (
	"database/sql"
	"encoding/json"
	"strconv"
	"time"

	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
)

func nullTime(t sql.NullTime) time.Time {
	if t.Valid {
		return t.Time
	}
	return time.Time{}
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	v := t.Time
	return &v
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid {
		return nil
	}
	v := s.String
	return &v
}

func nullBool(b sql.NullBool) bool {
	return b.Valid && b.Bool
}

func parseDecimal(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func parseNullDecimal(s sql.NullString) float64 {
	if !s.Valid {
		return 0
	}
	return parseDecimal(s.String)
}

func ToUser(u sqlc.User) models.User {
	return models.User{
		ID:        u.ID,
		FullName:  u.FullName,
		Email:     u.Email,
		Phone:     u.Phone,
		Password:  u.Password,
		Role:      models.UserRole(u.Role),
		Avatar:    nullStringPtr(u.Avatar),
		Disabled:  nullBool(u.Disabled),
		CreatedAt: nullTime(u.CreatedAt),
		UpdatedAt: nullTime(u.UpdatedAt),
	}
}

func ToAddress(a sqlc.Address) models.Address {
	return models.Address{
		ID:        a.ID,
		UserID:    a.UserID,
		Label:     a.Label,
		Street:    a.Street,
		City:      a.City,
		State:     a.State,
		Country:   a.Country,
		ZipCode:   a.ZipCode,
		IsDefault: nullBool(a.IsDefault),
	}
}

func rawJSONToStringArray(raw json.RawMessage) models.StringArray {
	if len(raw) == 0 {
		return models.StringArray{}
	}
	var arr models.StringArray
	_ = json.Unmarshal(raw, &arr)
	return arr
}

func rawJSONToColorArray(raw json.RawMessage) models.ColorArray {
	if len(raw) == 0 {
		return models.ColorArray{}
	}
	var arr models.ColorArray
	_ = json.Unmarshal(raw, &arr)
	return arr
}

func ToProduct(p sqlc.Product) models.Product {
	reviewCount := int32(0)
	if p.ReviewCount.Valid {
		reviewCount = p.ReviewCount.Int32
	}
	return models.Product{
		ID:          p.ID,
		VendorID:    p.VendorID,
		Name:        p.Name,
		Description: p.Description,
		Brand:       p.Brand,
		Category:    p.Category,
		Subcategory: p.Subcategory,
		Gender:      models.Gender(p.Gender),
		Price:       parseDecimal(p.Price),
		Discount:    parseNullDecimal(p.Discount),
		Images:      rawJSONToStringArray(p.Images),
		Colors:      rawJSONToColorArray(p.Colors),
		Sizes:       rawJSONToStringArray(p.Sizes),
		SKU:         p.Sku,
		Stock:       int(p.Stock),
		Rating:      parseNullDecimal(p.Rating),
		ReviewCount: int(reviewCount),
		Status:      models.ProductStatus(p.Status),
		Featured:    nullBool(p.Featured),
		Trending:    nullBool(p.Trending),
		Bestseller:  nullBool(p.Bestseller),
		NewArrival:  nullBool(p.NewArrival),
		CreatedAt:   nullTime(p.CreatedAt),
		UpdatedAt:   nullTime(p.UpdatedAt),
	}
}

func ToProducts(items []sqlc.Product) []models.Product {
	out := make([]models.Product, len(items))
	for i, p := range items {
		out[i] = ToProduct(p)
	}
	return out
}

func ToVendor(v sqlc.Vendor) models.Vendor {
	productCount := int32(0)
	if v.ProductCount.Valid {
		productCount = v.ProductCount.Int32
	}
	return models.Vendor{
		ID:            v.ID,
		UserID:        v.UserID,
		StoreName:     v.StoreName,
		Slug:          v.Slug,
		Description:   v.Description.String,
		Logo:          v.Logo,
		Banner:        v.Banner.String,
		ContactPhone:  v.ContactPhone,
		BusinessEmail: v.BusinessEmail,
		Country:       v.Country,
		City:          v.City,
		Categories:    rawJSONToStringArray(v.Categories),
		Rating:        parseNullDecimal(v.Rating),
		TotalSales:    parseNullDecimal(v.TotalSales),
		ProductCount:  int(productCount),
		Suspended:     nullBool(v.Suspended),
		IsFeatured:    nullBool(v.IsFeatured),
		CreatedAt:     nullTime(v.CreatedAt),
		UpdatedAt:     nullTime(v.UpdatedAt),
	}
}

func ToVendors(items []sqlc.Vendor) []models.Vendor {
	out := make([]models.Vendor, len(items))
	for i, v := range items {
		out[i] = ToVendor(v)
	}
	return out
}

func ToOrder(o sqlc.Order) models.Order {
	var items []models.OrderItem
	_ = json.Unmarshal(o.Items, &items)
	return models.Order{
		ID:              o.ID,
		UserID:          o.UserID,
		Items:           items,
		Subtotal:        parseDecimal(o.Subtotal),
		ShippingCost:    parseDecimal(o.ShippingCost),
		Total:           parseDecimal(o.Total),
		PaymentMethod:   o.PaymentMethod,
		Status:          models.OrderStatus(o.Status),
		DeliveryAddress: o.DeliveryAddress,
		Notes:           nullStringPtr(o.Notes),
		CreatedAt:       nullTime(o.CreatedAt),
		UpdatedAt:       nullTime(o.UpdatedAt),
		DeliveredAt:     nullTimePtr(o.DeliveredAt),
	}
}

func ToOrders(items []sqlc.Order) []models.Order {
	out := make([]models.Order, len(items))
	for i, o := range items {
		out[i] = ToOrder(o)
	}
	return out
}

func ToReview(r sqlc.Review) models.Review {
	return models.Review{
		ID:            r.ID,
		ProductID:     r.ProductID,
		VendorID:      r.VendorID,
		UserID:        r.UserID,
		OrderID:       r.OrderID,
		Rating:        int(r.Rating),
		Comment:       r.Comment,
		VendorReply:   nullStringPtr(r.VendorReply),
		VendorReplyAt: nullTimePtr(r.VendorReplyAt),
		CreatedAt:     nullTime(r.CreatedAt),
		UpdatedAt:     nullTime(r.UpdatedAt),
	}
}

func ToReviews(items []sqlc.Review) []models.Review {
	out := make([]models.Review, len(items))
	for i, r := range items {
		out[i] = ToReview(r)
	}
	return out
}

func ToApplication(a sqlc.VendorApplication) models.VendorApplication {
	return models.VendorApplication{
		ID:                  a.ID,
		UserID:              a.UserID,
		StoreName:           a.StoreName,
		BusinessDescription: a.BusinessDescription,
		Logo:                a.Logo,
		BusinessEmail:       a.BusinessEmail,
		ContactPhone:        a.ContactPhone,
		Country:             a.Country,
		City:                a.City,
		RegistrationNumber:  a.RegistrationNumber,
		Categories:          rawJSONToStringArray(a.Categories),
		RiskStatus:          a.RiskStatus.String,
		Status:              models.VendorApplicationStatus(a.Status),
		ReviewNote:          nullStringPtr(a.ReviewNote),
		SubmittedAt:         nullTime(a.SubmittedAt),
		ReviewedAt:          nullTimePtr(a.ReviewedAt),
		CreatedAt:           nullTime(a.CreatedAt),
		UpdatedAt:           nullTime(a.UpdatedAt),
	}
}

func ToApplications(items []sqlc.VendorApplication) []models.VendorApplication {
	out := make([]models.VendorApplication, len(items))
	for i, a := range items {
		out[i] = ToApplication(a)
	}
	return out
}

func ToSubscription(s sqlc.VendorSubscription) models.VendorSubscription {
	return models.VendorSubscription{
		ID:            s.ID,
		VendorID:      s.VendorID,
		Plan:          models.FeaturedListingPlan(s.Plan),
		AmountPaid:    parseDecimal(s.AmountPaid),
		PaymentMethod: s.PaymentMethod,
		StartedAt:     s.StartedAt,
		ExpiresAt:     s.ExpiresAt,
		Active:        nullBool(s.Active),
		CreatedAt:     nullTime(s.CreatedAt),
		UpdatedAt:     nullTime(s.UpdatedAt),
	}
}

func StringArrayToJSON(arr models.StringArray) json.RawMessage {
	if arr == nil {
		return json.RawMessage("[]")
	}
	b, _ := json.Marshal(arr)
	return b
}

func ColorArrayToJSON(arr models.ColorArray) json.RawMessage {
	if arr == nil {
		return json.RawMessage("[]")
	}
	b, _ := json.Marshal(arr)
	return b
}

func FloatToDecimalString(f float64) string {
	return strconv.FormatFloat(f, 'f', 2, 64)
}

func ToFloat(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case []byte:
		f, _ := strconv.ParseFloat(string(n), 64)
		return f
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	default:
		return 0
	}
}
