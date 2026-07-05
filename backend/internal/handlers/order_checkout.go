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
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
)

func prepareOrderPaymentMetadata(
	ctx context.Context,
	q *sqlc.Queries,
	userID types.BinaryUUID,
	req models.CreateOrderRequest,
	subtotal float64,
) (models.OrderPaymentMetadata, error) {
	deliveryCity := strings.TrimSpace(req.DeliveryCity)
	if deliveryCity == "" {
		return models.OrderPaymentMetadata{}, fmt.Errorf("delivery city is required")
	}

	shippingCost, lines, err := commerce.ResolveVendorShipping(ctx, q, req.Items, deliveryCity)
	if err != nil {
		return models.OrderPaymentMetadata{}, err
	}

	vendorShipments := make([]models.VendorShipmentMeta, len(lines))
	for i, line := range lines {
		vendorShipments[i] = models.VendorShipmentMeta{
			VendorID:        line.VendorID,
			StoreName:       line.StoreName,
			ShippingFee:     line.ShippingCost,
			OriginCity:      line.OriginCity,
			DestinationCity: line.DestinationCity,
			EstimatedDays:   line.EstimatedDays,
		}
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

	destName := commerce.DisplayCity(deliveryCity)

	return models.OrderPaymentMetadata{
		Items:           req.Items,
		VendorShipments: vendorShipments,
		PaymentMethod:   req.PaymentMethod,
		DeliveryAddress: req.DeliveryAddress,
		DeliveryCity:    deliveryCity,
		DeliveryZoneName: &destName,
		CouponCode:      couponCode,
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

func createVendorShipments(ctx context.Context, q *sqlc.Queries, orderID types.BinaryUUID, shipments []models.VendorShipmentMeta) error {
	for _, line := range shipments {
		vendorID, err := utils.ParseID(line.VendorID)
		if err != nil {
			continue
		}
		vid := vendorID
		if err := q.CreateShipment(ctx, sqlc.CreateShipmentParams{
			ID:              utils.GenerateBinaryID(),
			OrderID:         orderID,
			VendorID:        &vid,
			ShippingFee:     store.FloatToDecimalString(line.ShippingFee),
			OriginCity:      sql.NullString{String: line.OriginCity, Valid: line.OriginCity != ""},
			DestinationCity: sql.NullString{String: line.DestinationCity, Valid: line.DestinationCity != ""},
			Carrier:         sql.NullString{},
			TrackingNumber:  sql.NullString{},
		}); err != nil {
			return err
		}
	}
	return nil
}
