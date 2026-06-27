package store

import (
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
)

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

func nullDecimalStringToFloatPtr(s sql.NullString) *float64 {
	if !s.Valid || strings.TrimSpace(s.String) == "" {
		return nil
	}
	v := parseDecimal(s.String)
	return &v
}

func nullUUIDPtr(u *types.BinaryUUID) *string {
	if u == nil || u.IsZero() {
		return nil
	}
	s := u.String()
	return &s
}

func optionalBinaryUUIDString(u *types.BinaryUUID) string {
	if u == nil || u.IsZero() {
		return ""
	}
	return u.String()
}

func boolFromInt16(v int16) bool {
	return v != 0
}

func parseDecimal(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func isLegacyLocalUpload(url string) bool {
	u := strings.TrimSpace(url)
	return strings.HasPrefix(u, "/uploads/") || strings.HasPrefix(u, "uploads/")
}

func sanitizeMediaURLString(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || isLegacyLocalUpload(s) {
		return ""
	}
	return s
}

func optionalMediaURL(s sql.NullString) *string {
	if !s.Valid {
		return nil
	}
	cleaned := sanitizeMediaURLString(s.String)
	if cleaned == "" {
		return nil
	}
	return &cleaned
}

func ToUser(u sqlc.User) models.User {
	var passwordSetAt *time.Time
	if u.PasswordSetAt.Valid {
		t := u.PasswordSetAt.Time
		passwordSetAt = &t
	}
	return models.User{
		ID:            u.ID.String(),
		FullName:      u.FullName,
		Email:         u.Email,
		Phone:         u.Phone,
		Password:      u.Password,
		Role:          models.UserRole(u.Role),
		Avatar:        optionalMediaURL(u.Avatar),
		Disabled:      boolFromInt16(u.Disabled),
		PasswordSetAt: passwordSetAt,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
	}
}

func ToAddress(a sqlc.Address) models.Address {
	return models.Address{
		ID:        a.ID.String(),
		UserID:    a.UserID.String(),
		Label:     a.Label,
		Street:    a.Street,
		City:      a.City,
		State:     a.State,
		Country:   a.Country,
		ZipCode:   a.ZipCode,
		IsDefault: boolFromInt16(a.IsDefault),
	}
}

func rawJSONToMapType(raw *json.RawMessage) models.MapType {
	if raw == nil || len(*raw) == 0 {
		return models.MapType{}
	}
	var m models.MapType
	if err := json.Unmarshal(*raw, &m); err != nil || m == nil {
		return models.MapType{}
	}
	return m
}

func rawJSONToStringArray(raw json.RawMessage) models.StringArray {
	if len(raw) == 0 {
		return models.StringArray{}
	}
	var arr models.StringArray
	_ = json.Unmarshal(raw, &arr)
	return arr
}

var colorPresetByName = map[string]string{
	"black": "#000000", "white": "#FFFFFF", "navy": "#1B2A4A", "grey": "#9CA3AF",
	"gray": "#9CA3AF", "red": "#DC2626", "blue": "#2563EB", "green": "#16A34A",
}

func normalizeColor(c models.Color) models.Color {
	name := strings.TrimSpace(c.Name)
	code := strings.TrimSpace(c.Code)
	if preset, ok := colorPresetByName[strings.ToLower(name)]; ok && code == "" {
		code = preset
	}
	if code == "" {
		code = "#9CA3AF"
	}
	if !strings.HasPrefix(code, "#") {
		code = "#" + code
	}
	if name == "" {
		name = "Color"
	}
	return models.Color{Name: name, Code: strings.ToUpper(code)}
}

func VariantsToColors(variants []sqlc.ProductVariant) models.ColorArray {
	seen := make(map[string]struct{})
	out := make(models.ColorArray, 0, len(variants))
	for _, v := range variants {
		key := strings.ToLower(v.Color)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		color := models.Color{Name: v.Color}
		if v.ColorHex.Valid {
			color.Code = v.ColorHex.String
		}
		out = append(out, normalizeColor(color))
	}
	return out
}

func VariantsToSizes(variants []sqlc.ProductVariant) models.StringArray {
	seen := make(map[string]struct{})
	out := make(models.StringArray, 0, len(variants))
	for _, v := range variants {
		if _, ok := seen[v.Size]; ok {
			continue
		}
		seen[v.Size] = struct{}{}
		out = append(out, v.Size)
	}
	return out
}

func variantsToVariantArray(variants []sqlc.ProductVariant) models.VariantArray {
	out := make(models.VariantArray, len(variants))
	for i, v := range variants {
		out[i] = models.ProductVariant{
			Size:  v.Size,
			Color: v.Color,
			Stock: int(v.Stock),
		}
	}
	return out
}

func imagesToURLs(images []sqlc.ProductImage) models.StringArray {
	out := make(models.StringArray, 0, len(images))
	for _, img := range images {
		if url := sanitizeMediaURLString(img.Url); url != "" {
			out = append(out, url)
		}
	}
	return out
}

func ToProduct(p sqlc.Product) models.Product {
	return ToProductDetails(p, nil, nil, "", "")
}

const newArrivalWindow = 7 * 24 * time.Hour

func isNewArrivalProduct(createdAt time.Time, flagged int16) bool {
	return boolFromInt16(flagged) || time.Since(createdAt) <= newArrivalWindow
}

func ToProductDetails(p sqlc.Product, variants []sqlc.ProductVariant, images []sqlc.ProductImage, category, subcategory string) models.Product {
	price := parseDecimal(p.MinPrice)
	discount := 0.0
	if len(variants) > 0 {
		price = parseDecimal(variants[0].Price)
		discount = parseDecimal(variants[0].Discount)
	}
	return models.Product{
		ID:           p.ID.String(),
		VendorID:     p.VendorID.String(),
		Name:         p.Name,
		Description:  p.Description,
		Brand:        p.Brand,
		Category:     category,
		Subcategory:  subcategory,
		Gender:       models.Gender(p.Gender),
		Price:        price,
		Discount:     discount,
		Images:       imagesToURLs(images),
		Colors:       VariantsToColors(variants),
		Sizes:        VariantsToSizes(variants),
		SKU:          p.Sku,
		Stock:        int(p.TotalStock),
		VariantStock: variantsToVariantArray(variants),
		Rating:       parseDecimal(p.Rating),
		ReviewCount:  int(p.ReviewCount),
		Status:       models.ProductStatus(p.Status),
		Featured:     boolFromInt16(p.Featured),
		Trending:     boolFromInt16(p.Trending),
		Bestseller:   boolFromInt16(p.Bestseller),
		NewArrival:   isNewArrivalProduct(p.CreatedAt, p.NewArrival),
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
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
	rating := parseDecimal(v.Rating)
	return models.Vendor{
		ID:                v.ID.String(),
		UserID:            v.UserID.String(),
		StoreName:         v.StoreName,
		Slug:              v.Slug,
		Description:       v.Description.String,
		Logo:              sanitizeMediaURLString(v.Logo),
		Banner:            sanitizeMediaURLString(v.Banner.String),
		ContactPhone:      v.ContactPhone,
		BusinessEmail:     v.BusinessEmail,
		Country:           v.Country,
		City:              v.City,
		ShippingCost:      parseDecimal(v.ShippingCost),
		FreeShippingThreshold: nullDecimalStringToFloatPtr(v.FreeShippingThreshold),
		SocialLinks:       rawJSONToMapType(v.SocialLinks),
		Categories:        models.StringArray{},
		Rating:            rating,
		VerificationBadge: models.VendorVerificationBadge(rating),
		TotalSales:        0,
		ProductCount:      0,
		Suspended:         boolFromInt16(v.Suspended),
		IsFeatured:        boolFromInt16(v.IsFeatured),
		CreatedAt:         v.CreatedAt,
		UpdatedAt:         v.UpdatedAt,
	}
}

func ToVendors(items []sqlc.Vendor) []models.Vendor {
	out := make([]models.Vendor, len(items))
	for i, v := range items {
		out[i] = ToVendor(v)
	}
	return out
}

func deliveryAddressString(raw json.RawMessage) string {
	addr := parseOrderShippingAddress(raw)
	if addr == nil {
		return ""
	}
	parts := []string{addr.Street, addr.City, addr.State, addr.Country, addr.ZipCode, addr.Label}
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, ", ")
}

func parseOrderShippingAddress(raw json.RawMessage) *models.OrderShippingAddress {
	if len(raw) == 0 {
		return nil
	}
	var quoted string
	if err := json.Unmarshal(raw, &quoted); err == nil && strings.TrimSpace(quoted) != "" {
		return &models.OrderShippingAddress{Street: quoted}
	}
	var m struct {
		Label   string `json:"label"`
		Street  string `json:"street"`
		City    string `json:"city"`
		State   string `json:"state"`
		Country string `json:"country"`
		ZipCode string `json:"zip_code"`
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return &models.OrderShippingAddress{Street: string(raw)}
	}
	if m.Street == "" && m.City == "" && m.Label == "" {
		return nil
	}
	return &models.OrderShippingAddress{
		Label:   m.Label,
		Street:  m.Street,
		City:    m.City,
		State:   m.State,
		Country: m.Country,
		ZipCode: m.ZipCode,
	}
}

func sqlcOrderItemToModel(item sqlc.OrderItem) models.OrderItem {
	return models.OrderItem{
		ProductID:    item.ProductID.String(),
		ProductName:  item.ProductName,
		ProductImage: sanitizeMediaURLString(item.ImageUrl.String),
		VendorID:     item.VendorID.String(),
		Price:        parseDecimal(item.UnitPrice),
		Quantity:     int(item.Quantity),
		Size:         item.Size,
		Color:        item.Color,
	}
}

func ToOrder(o sqlc.Order) models.Order {
	return ToOrderWithItems(o, nil)
}

func ToOrderWithItems(o sqlc.Order, items []sqlc.OrderItem) models.Order {
	orderItems := make([]models.OrderItem, len(items))
	for i, item := range items {
		orderItems[i] = sqlcOrderItemToModel(item)
	}
	return models.Order{
		ID:              o.ID.String(),
		UserID:          o.UserID.String(),
		Items:           orderItems,
		Subtotal:        parseDecimal(o.Subtotal),
		Discount:        parseDecimal(o.DiscountAmount),
		ShippingCost:    parseDecimal(o.ShippingCost),
		Tax:             parseDecimal(o.TaxAmount),
		Total:           parseDecimal(o.Total),
		PaymentMethod:   o.PaymentMethod,
		Status:          models.OrderStatus(o.Status),
		DeliveryAddress: deliveryAddressString(o.DeliveryAddress),
		ShippingAddress: parseOrderShippingAddress(o.DeliveryAddress),
		Notes:           nullStringPtr(o.Notes),
		CreatedAt:       o.CreatedAt,
		UpdatedAt:       o.UpdatedAt,
		DeliveredAt:     nullTimePtr(o.DeliveredAt),
	}
}

func ToOrders(rows []sqlc.Order) []models.Order {
	out := make([]models.Order, len(rows))
	for i, o := range rows {
		out[i] = ToOrder(o)
	}
	return out
}

func ToReview(r sqlc.Review) models.Review {
	return models.Review{
		ID:            r.ID.String(),
		ProductID:     r.ProductID.String(),
		VendorID:      r.VendorID.String(),
		UserID:        r.UserID.String(),
		OrderID:       optionalBinaryUUIDString(r.OrderID),
		Rating:        int(r.Rating),
		Comment:       r.Comment,
		VendorReply:   nullStringPtr(r.VendorReply),
		VendorReplyAt: nullTimePtr(r.VendorReplyAt),
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
	}
}

func ToReviews(items []sqlc.Review) []models.Review {
	result := make([]models.Review, len(items))
	for i, r := range items {
		result[i] = ToReview(r)
	}
	return result
}

func ToApplication(a sqlc.VendorApplication) models.VendorApplication {
	userID := ""
	if a.UserID != nil && !a.UserID.IsZero() {
		userID = a.UserID.String()
	}
	logo := sanitizeMediaURLString(a.VendorPhoto)
	if logo == "" {
		logo = sanitizeMediaURLString(a.Logo)
	}
	return models.VendorApplication{
		ID:                  a.ID.String(),
		UserID:              userID,
		ApplicantName:       a.ApplicantName,
		StoreName:           a.StoreName,
		BusinessDescription: a.BusinessDescription,
		Logo:                logo,
		BusinessCertificate: a.BusinessCertificate,
		VendorPhoto:         sanitizeMediaURLString(a.VendorPhoto),
		BusinessPhoto:       sanitizeMediaURLString(a.BusinessPhoto),
		BusinessEmail:       a.BusinessEmail,
		ContactPhone:        a.ContactPhone,
		Country:             a.Country,
		City:                a.City,
		RegistrationNumber:  a.RegistrationNumber,
		Categories:          rawJSONToStringArray(a.Categories),
		RiskStatus:          string(a.RiskStatus),
		Status:              models.VendorApplicationStatus(a.Status),
		ReviewNote:          nullStringPtr(a.ReviewNote),
		SubmittedAt:         a.SubmittedAt,
		ReviewedAt:          nullTimePtr(a.ReviewedAt),
		CreatedAt:           a.CreatedAt,
		UpdatedAt:           a.UpdatedAt,
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
		ID:            s.ID.String(),
		VendorID:      s.VendorID.String(),
		Plan:          models.FeaturedListingPlan(s.Plan),
		AmountPaid:    parseDecimal(s.AmountPaid),
		PaymentMethod: s.PaymentMethod,
		StartedAt:     s.StartedAt,
		ExpiresAt:     s.ExpiresAt,
		Active:        boolFromInt16(s.Active),
		CreatedAt:     s.CreatedAt,
		UpdatedAt:     s.UpdatedAt,
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

func VariantArrayToJSON(arr models.VariantArray) json.RawMessage {
	if arr == nil {
		return json.RawMessage("[]")
	}
	b, _ := json.Marshal(arr)
	return b
}

func FloatToDecimalString(f float64) string {
	return strconv.FormatFloat(f, 'f', 2, 64)
}

func ParseDecimalString(s string) float64 {
	return parseDecimal(s)
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

func DeliveryAddressJSON(street, city, state, country, zip, label string) json.RawMessage {
	payload := map[string]string{
		"street": street, "city": city, "state": state,
		"country": country, "zip_code": zip, "label": label,
	}
	b, _ := json.Marshal(payload)
	return b
}
