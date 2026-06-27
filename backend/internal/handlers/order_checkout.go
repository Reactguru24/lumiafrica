package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/commerce"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/utils"
)

func prepareOrderPaymentMetadata(
	ctx context.Context,
	q *sqlc.Queries,
	userID types.BinaryUUID,
	req models.CreateOrderRequest,
	subtotal float64,
) (models.OrderPaymentMetadata, error) {
	shippingCost, _, err := commerce.ResolveVendorShipping(ctx, q, req.Items, zoneIDFromRequest(req))
	if err != nil {
		return models.OrderPaymentMetadata{}, err
	}

	discount := 0.0
	var couponID, couponCode *string
	if req.CouponCode != nil && *req.CouponCode != "" {
		coupon, amount, err := commerce.ValidateCoupon(ctx, q, *req.CouponCode, userID, subtotal)
		if err != nil {
			return models.OrderPaymentMetadata{}, fmt.Errorf("%s", commerce.CouponErrorMessage(err))
		}
		discount = amount
		cid := coupon.ID.String()
		couponID = &cid
		cc := coupon.Code
		couponCode = &cc
	}

	taxAmount := subtotal * defaultTaxRate
	total := subtotal - discount + shippingCost + taxAmount
	if total < 0 {
		total = 0
	}

	var zoneID, zoneName *string
	if req.DeliveryZoneID != nil && strings.TrimSpace(*req.DeliveryZoneID) != "" {
		key := strings.TrimSpace(*req.DeliveryZoneID)
		if id, err := utils.ParseID(key); err == nil {
			s := id.String()
			zoneID = &s
		} else {
			zoneName = &key
		}
	}

	return models.OrderPaymentMetadata{
		Items:            req.Items,
		PaymentMethod:    req.PaymentMethod,
		DeliveryAddress:  req.DeliveryAddress,
		DeliveryCity:     req.DeliveryCity,
		DeliveryZoneID:   zoneID,
		DeliveryZoneName: zoneName,
		CouponCode:       couponCode,
		CouponID:         couponID,
		Notes:            req.Notes,
		Subtotal:         subtotal,
		DiscountAmount:   discount,
		ShippingCost:     shippingCost,
		TaxAmount:        taxAmount,
		Total:            total,
	}, nil
}

func optionalBinaryUUID(s *string) *types.BinaryUUID {
	if s == nil || *s == "" {
		return nil
	}
	id, err := utils.ParseID(*s)
	if err != nil {
		return nil
	}
	return &id
}

func optionalZoneName(s *string) sql.NullString {
	if s == nil || strings.TrimSpace(*s) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: strings.TrimSpace(*s), Valid: true}
}

func zoneIDFromRequest(req models.CreateOrderRequest) string {
	if req.DeliveryZoneID != nil {
		return strings.TrimSpace(*req.DeliveryZoneID)
	}
	return ""
}
