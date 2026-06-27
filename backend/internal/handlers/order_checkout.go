package handlers

import (
	"context"
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

	var zoneID *string
	if req.DeliveryZoneID != nil && strings.TrimSpace(*req.DeliveryZoneID) != "" {
		zid := strings.TrimSpace(*req.DeliveryZoneID)
		zoneID = &zid
	}

	return models.OrderPaymentMetadata{
		Items:           req.Items,
		PaymentMethod:   req.PaymentMethod,
		DeliveryAddress: req.DeliveryAddress,
		DeliveryCity:    req.DeliveryCity,
		DeliveryZoneID:  zoneID,
		CouponCode:      couponCode,
		CouponID:        couponID,
		Notes:           req.Notes,
		Subtotal:        subtotal,
		DiscountAmount:  discount,
		ShippingCost:    shippingCost,
		TaxAmount:       taxAmount,
		Total:           total,
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

func zoneIDFromRequest(req models.CreateOrderRequest) string {
	if req.DeliveryZoneID != nil {
		return strings.TrimSpace(*req.DeliveryZoneID)
	}
	return ""
}
