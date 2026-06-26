package store

import (
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
)

func ToDeliveryZone(z sqlc.DeliveryZone) models.DeliveryZoneResponse {
	return models.DeliveryZoneResponse{
		ID:            z.ID.String(),
		Name:          z.Name,
		BaseCost:      ParseDecimalString(z.BaseCost),
		EstimatedDays: z.EstimatedDays,
	}
}

func ToCoupon(c sqlc.Coupon) models.CouponResponse {
	out := models.CouponResponse{
		ID:             c.ID.String(),
		Code:           c.Code,
		Type:           string(c.Type),
		Value:          ParseDecimalString(c.Value),
		MinOrderAmount: ParseDecimalString(c.MinOrderAmount),
		UsesCount:      int(c.UsesCount),
		PerUserLimit:   int(c.PerUserLimit),
		Active:         c.Active != 0,
	}
	if c.MaxDiscount.Valid {
		v := ParseDecimalString(c.MaxDiscount.String)
		out.MaxDiscount = &v
	}
	if c.MaxUses.Valid {
		v := int(c.MaxUses.Int32)
		out.MaxUses = &v
	}
	if c.StartsAt.Valid {
		t := c.StartsAt.Time
		out.StartsAt = &t
	}
	if c.ExpiresAt.Valid {
		t := c.ExpiresAt.Time
		out.ExpiresAt = &t
	}
	return out
}

func ToPromotion(p sqlc.Promotion, productIDs []string, image string) models.PromotionResponse {
	return models.PromotionResponse{
		ID:            p.ID.String(),
		Name:          p.Name,
		Type:          string(p.Type),
		DiscountType:  string(p.DiscountType),
		DiscountValue: ParseDecimalString(p.DiscountValue),
		StartsAt:      p.StartsAt,
		EndsAt:        p.EndsAt,
		Active:        p.Active != 0,
		Image:         image,
		ProductIDs:    productIDs,
	}
}

func ToCollection(c sqlc.Collection, productIDs []string, products []models.Product) models.CollectionResponse {
	out := models.CollectionResponse{
		ID:         c.ID.String(),
		Name:       c.Name,
		Slug:       c.Slug,
		SortOrder:  int(c.SortOrder),
		Active:     c.Active != 0,
		ProductIDs: productIDs,
		Products:   products,
	}
	if c.Description.Valid {
		out.Description = c.Description.String
	}
	if c.Image.Valid {
		out.Image = c.Image.String
	}
	return out
}
