package sqlc

import (
	"context"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/types"
)

type OrderVendorSettlement struct {
	ID              types.BinaryUUID `json:"id"`
	OrderID         types.BinaryUUID `json:"order_id"`
	VendorID        types.BinaryUUID `json:"vendor_id"`
	ProductSubtotal string           `json:"product_subtotal"`
	ShippingFee     string           `json:"shipping_fee"`
	PlatformFee     string           `json:"platform_fee"`
	VendorEarnings  string           `json:"vendor_earnings"`
	Status          string           `json:"status"`
	PayoutStatus    string           `json:"payout_status"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type CreateOrderVendorSettlementParams struct {
	ID              types.BinaryUUID `json:"id"`
	OrderID         types.BinaryUUID `json:"order_id"`
	VendorID        types.BinaryUUID `json:"vendor_id"`
	ProductSubtotal string           `json:"product_subtotal"`
	ShippingFee     string           `json:"shipping_fee"`
	PlatformFee     string           `json:"platform_fee"`
	VendorEarnings  string           `json:"vendor_earnings"`
	Status          string           `json:"status"`
}

func (q *Queries) CreateOrderVendorSettlement(ctx context.Context, arg CreateOrderVendorSettlementParams) error {
	const query = `INSERT INTO order_vendor_settlements (
  id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := q.db.ExecContext(ctx, query,
		arg.ID, arg.OrderID, arg.VendorID, arg.ProductSubtotal, arg.ShippingFee,
		arg.PlatformFee, arg.VendorEarnings, arg.Status,
	)
	return err
}

func scanOrderVendorSettlements(rows interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
}) ([]OrderVendorSettlement, error) {
	items := []OrderVendorSettlement{}
	for rows.Next() {
		var i OrderVendorSettlement
		if err := rows.Scan(
			&i.ID, &i.OrderID, &i.VendorID, &i.ProductSubtotal, &i.ShippingFee,
			&i.PlatformFee, &i.VendorEarnings, &i.Status, &i.PayoutStatus,
			&i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (q *Queries) ListOrderVendorSettlementsByOrder(ctx context.Context, orderID types.BinaryUUID) ([]OrderVendorSettlement, error) {
	const query = `SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE order_id = ?
ORDER BY created_at ASC`
	rows, err := q.db.QueryContext(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrderVendorSettlements(rows)
}

func (q *Queries) GetOrderVendorSettlement(ctx context.Context, orderID, vendorID types.BinaryUUID) (OrderVendorSettlement, error) {
	const query = `SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE order_id = ? AND vendor_id = ?
LIMIT 1`
	row := q.db.QueryRowContext(ctx, query, orderID, vendorID)
	var i OrderVendorSettlement
	err := row.Scan(
		&i.ID, &i.OrderID, &i.VendorID, &i.ProductSubtotal, &i.ShippingFee,
		&i.PlatformFee, &i.VendorEarnings, &i.Status, &i.PayoutStatus,
		&i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}

type UpdateOrderVendorSettlementStatusParams struct {
	Status   string           `json:"status"`
	OrderID  types.BinaryUUID `json:"order_id"`
	VendorID types.BinaryUUID `json:"vendor_id"`
}

func (q *Queries) UpdateOrderVendorSettlementStatus(ctx context.Context, arg UpdateOrderVendorSettlementStatusParams) error {
	const query = `UPDATE order_vendor_settlements SET status = ?, updated_at = NOW() WHERE order_id = ? AND vendor_id = ?`
	_, err := q.db.ExecContext(ctx, query, arg.Status, arg.OrderID, arg.VendorID)
	return err
}

func (q *Queries) MarkOrderVendorSettlementPaid(ctx context.Context, id, vendorID types.BinaryUUID) error {
	const query = `UPDATE order_vendor_settlements SET payout_status = 'paid', updated_at = NOW() WHERE id = ? AND vendor_id = ?`
	_, err := q.db.ExecContext(ctx, query, id, vendorID)
	return err
}

func (q *Queries) GetVendorAvailableSettlementBalance(ctx context.Context, vendorID types.BinaryUUID) (string, error) {
	const query = `SELECT COALESCE(SUM(vendor_earnings), 0) AS balance
FROM order_vendor_settlements
WHERE vendor_id = ?
  AND status = 'delivered'
  AND payout_status = 'pending'`
	row := q.db.QueryRowContext(ctx, query, vendorID)
	var balance string
	err := row.Scan(&balance)
	return balance, err
}

func (q *Queries) ListPayableVendorSettlements(ctx context.Context, vendorID types.BinaryUUID) ([]OrderVendorSettlement, error) {
	const query = `SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE vendor_id = ?
  AND status = 'delivered'
  AND payout_status = 'pending'
ORDER BY updated_at ASC`
	rows, err := q.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrderVendorSettlements(rows)
}

func (q *Queries) CountUndeliveredVendorSettlementsForOrder(ctx context.Context, orderID types.BinaryUUID) (int64, error) {
	const query = `SELECT COUNT(*) AS count
FROM order_vendor_settlements
WHERE order_id = ?
  AND status != 'delivered'
  AND status != 'cancelled'`
	row := q.db.QueryRowContext(ctx, query, orderID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

type UpdateShipmentStatusParams struct {
	Status   ShipmentsStatus  `json:"status"`
	OrderID  types.BinaryUUID `json:"order_id"`
	VendorID types.BinaryUUID `json:"vendor_id"`
}

func (q *Queries) UpdateShipmentStatus(ctx context.Context, arg UpdateShipmentStatusParams) error {
	const query = `UPDATE shipments
SET status = ?,
    shipped_at = CASE WHEN ? IN ('picked_up','in_transit','out_for_delivery','delivered') AND shipped_at IS NULL THEN NOW() ELSE shipped_at END,
    delivered_at = CASE WHEN ? = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
WHERE order_id = ? AND vendor_id = ?`
	_, err := q.db.ExecContext(ctx, query,
		arg.Status, arg.Status, arg.Status, arg.OrderID, arg.VendorID,
	)
	return err
}

func (q *Queries) GetShipmentByOrderAndVendor(ctx context.Context, orderID, vendorID types.BinaryUUID) (VendorShipment, error) {
	const query = `SELECT id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
       carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery, delivered_at, created_at, updated_at
FROM shipments WHERE order_id = ? AND vendor_id = ? LIMIT 1`
	row := q.db.QueryRowContext(ctx, query, orderID, vendorID)
	var i VendorShipment
	err := row.Scan(
		&i.ID, &i.OrderID, &i.VendorID, &i.ShippingFee, &i.OriginCity, &i.DestinationCity,
		&i.Carrier, &i.TrackingNumber, &i.TrackingUrl, &i.Status,
		&i.ShippedAt, &i.EstimatedDelivery, &i.DeliveredAt, &i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}

func (q *Queries) GetFirstOrderItemForVendorOrder(ctx context.Context, orderID, vendorID types.BinaryUUID) (OrderItem, error) {
	const query = `SELECT id, order_id, product_id, variant_id, vendor_id, product_name, sku, size, color, image_url, unit_price, discount, quantity, subtotal, vendor_earnings, platform_fee
FROM order_items WHERE order_id = ? AND vendor_id = ? ORDER BY id ASC LIMIT 1`
	row := q.db.QueryRowContext(ctx, query, orderID, vendorID)
	var i OrderItem
	err := row.Scan(
		&i.ID, &i.OrderID, &i.ProductID, &i.VariantID, &i.VendorID, &i.ProductName, &i.Sku,
		&i.Size, &i.Color, &i.ImageUrl, &i.UnitPrice, &i.Discount, &i.Quantity,
		&i.Subtotal, &i.VendorEarnings, &i.PlatformFee,
	)
	return i, err
}
