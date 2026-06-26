package commerce

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
)

var (
	ErrCouponNotFound   = errors.New("coupon not found")
	ErrCouponInactive   = errors.New("coupon is not active")
	ErrCouponExpired    = errors.New("coupon has expired")
	ErrCouponNotStarted = errors.New("coupon is not yet active")
	ErrCouponMinOrder   = errors.New("order does not meet minimum amount")
	ErrCouponMaxUses    = errors.New("coupon usage limit reached")
	ErrCouponUserLimit  = errors.New("you have already used this coupon")
)

func ResolveShippingCost(ctx context.Context, q *sqlc.Queries, city string, deliveryZoneID *string) (float64, *sqlc.DeliveryZone, error) {
	if deliveryZoneID != nil && strings.TrimSpace(*deliveryZoneID) != "" {
		id, err := utils.ParseID(*deliveryZoneID)
		if err != nil {
			return 0, nil, fmt.Errorf("invalid delivery zone")
		}
		zone, err := q.GetDeliveryZoneByID(ctx, id)
		if err != nil {
			return 0, nil, fmt.Errorf("delivery zone not found")
		}
		cost := store.ParseDecimalString(zone.BaseCost)
		return cost, &zone, nil
	}
	city = strings.TrimSpace(city)
	if city == "" {
		return 10, nil, nil
	}
	zone, err := q.FindDeliveryZoneByCity(ctx, city)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 10, nil, nil
		}
		return 0, nil, err
	}
	return store.ParseDecimalString(zone.BaseCost), &zone, nil
}

func ValidateCoupon(ctx context.Context, q *sqlc.Queries, code string, userID types.BinaryUUID, subtotal float64) (sqlc.Coupon, float64, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return sqlc.Coupon{}, 0, ErrCouponNotFound
	}
	coupon, err := q.GetCouponByCode(ctx, code)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return sqlc.Coupon{}, 0, ErrCouponNotFound
		}
		return sqlc.Coupon{}, 0, err
	}
	if coupon.Active == 0 {
		return sqlc.Coupon{}, 0, ErrCouponInactive
	}
	now := time.Now()
	if coupon.StartsAt.Valid && coupon.StartsAt.Time.After(now) {
		return sqlc.Coupon{}, 0, ErrCouponNotStarted
	}
	if coupon.ExpiresAt.Valid && coupon.ExpiresAt.Time.Before(now) {
		return sqlc.Coupon{}, 0, ErrCouponExpired
	}
	minOrder := store.ParseDecimalString(coupon.MinOrderAmount)
	if subtotal < minOrder {
		return sqlc.Coupon{}, 0, ErrCouponMinOrder
	}
	if coupon.MaxUses.Valid && coupon.UsesCount >= coupon.MaxUses.Int32 {
		return sqlc.Coupon{}, 0, ErrCouponMaxUses
	}
	uses, err := q.CountCouponUsesByUser(ctx, sqlc.CountCouponUsesByUserParams{
		CouponID: coupon.ID,
		UserID:   userID,
	})
	if err != nil {
		return sqlc.Coupon{}, 0, err
	}
	if int(uses) >= int(coupon.PerUserLimit) {
		return sqlc.Coupon{}, 0, ErrCouponUserLimit
	}
	discount := calculateDiscount(coupon, subtotal)
	return coupon, discount, nil
}

func calculateDiscount(coupon sqlc.Coupon, subtotal float64) float64 {
	value := store.ParseDecimalString(coupon.Value)
	var discount float64
	switch coupon.Type {
	case sqlc.CouponsTypePercentage:
		discount = subtotal * (value / 100)
		if coupon.MaxDiscount.Valid {
			cap := store.ParseDecimalString(coupon.MaxDiscount.String)
			if discount > cap {
				discount = cap
			}
		}
	case sqlc.CouponsTypeFixed:
		discount = value
	}
	if discount > subtotal {
		discount = subtotal
	}
	return discount
}

func CouponErrorMessage(err error) string {
	switch {
	case errors.Is(err, ErrCouponNotFound):
		return "Invalid coupon code"
	case errors.Is(err, ErrCouponInactive):
		return "This coupon is no longer active"
	case errors.Is(err, ErrCouponExpired):
		return "This coupon has expired"
	case errors.Is(err, ErrCouponNotStarted):
		return "This coupon is not active yet"
	case errors.Is(err, ErrCouponMinOrder):
		return "Order total does not meet the coupon minimum"
	case errors.Is(err, ErrCouponMaxUses):
		return "This coupon has reached its usage limit"
	case errors.Is(err, ErrCouponUserLimit):
		return "You have already used this coupon"
	default:
		return "Unable to apply coupon"
	}
}
