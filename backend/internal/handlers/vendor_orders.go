package handlers

import (
	"context"
	"database/sql"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/utils"
)

func shipmentStatusFromOrderStatus(status models.OrderStatus) sqlc.ShipmentsStatus {
	switch status {
	case models.OrderStatusShipped:
		return sqlc.ShipmentsStatusInTransit
	case models.OrderStatusDelivered:
		return sqlc.ShipmentsStatusDelivered
	case models.OrderStatusCancelled:
		return sqlc.ShipmentsStatusFailed
	default:
		return sqlc.ShipmentsStatusPending
	}
}

func syncOrderStatusAfterVendorUpdate(ctx context.Context, q *sqlc.Queries, orderID types.BinaryUUID) error {
	pending, err := q.CountUndeliveredVendorSettlementsForOrder(ctx, orderID)
	if err != nil {
		return err
	}
	if pending > 0 {
		return nil
	}
	now := utils.Now()
	return q.UpdateOrderStatus(ctx, sqlc.UpdateOrderStatusParams{
		Status:      sqlc.OrdersStatusDelivered,
		DeliveredAt: sql.NullTime{Time: now, Valid: true},
		ID:          orderID,
	})
}
