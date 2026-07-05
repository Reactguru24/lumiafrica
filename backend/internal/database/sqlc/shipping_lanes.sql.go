package sqlc

import (
	"context"
	"database/sql"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/types"
)

type ShippingLaneRate struct {
	ID              types.BinaryUUID `json:"id"`
	OriginCity      string           `json:"origin_city"`
	DestinationCity string           `json:"destination_city"`
	Fee             string           `json:"fee"`
	EstimatedDays   string           `json:"estimated_days"`
	Active          int16            `json:"active"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type VendorShipment struct {
	ID                types.BinaryUUID  `json:"id"`
	OrderID           types.BinaryUUID  `json:"order_id"`
	VendorID          *types.BinaryUUID `json:"vendor_id"`
	ShippingFee       string            `json:"shipping_fee"`
	OriginCity        sql.NullString    `json:"origin_city"`
	DestinationCity   sql.NullString    `json:"destination_city"`
	Carrier           sql.NullString    `json:"carrier"`
	TrackingNumber    sql.NullString    `json:"tracking_number"`
	TrackingUrl       sql.NullString    `json:"tracking_url"`
	Status            ShipmentsStatus   `json:"status"`
	ShippedAt         sql.NullTime      `json:"shipped_at"`
	EstimatedDelivery sql.NullTime      `json:"estimated_delivery"`
	DeliveredAt       sql.NullTime      `json:"delivered_at"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

const listActiveDeliveryCities = `-- name: ListActiveDeliveryCities :many
SELECT DISTINCT destination_city
FROM shipping_lane_rates
WHERE active = true
ORDER BY destination_city
`

func (q *Queries) ListActiveDeliveryCities(ctx context.Context) ([]string, error) {
	rows, err := q.db.QueryContext(ctx, listActiveDeliveryCities)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var city string
		if err := rows.Scan(&city); err != nil {
			return nil, err
		}
		items = append(items, city)
	}
	return items, rows.Err()
}

const getShippingLaneRate = `-- name: GetShippingLaneRate :one
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates
WHERE active = true
  AND LOWER(origin_city) = LOWER(?)
  AND LOWER(destination_city) = LOWER(?)
LIMIT 1
`

func (q *Queries) GetShippingLaneRate(ctx context.Context, originCity, destinationCity string) (ShippingLaneRate, error) {
	row := q.db.QueryRowContext(ctx, getShippingLaneRate, originCity, destinationCity)
	var i ShippingLaneRate
	err := row.Scan(
		&i.ID, &i.OriginCity, &i.DestinationCity, &i.Fee, &i.EstimatedDays, &i.Active, &i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}

const listAllShippingLaneRates = `-- name: ListAllShippingLaneRates :many
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates
ORDER BY origin_city, destination_city
`

func (q *Queries) ListAllShippingLaneRates(ctx context.Context) ([]ShippingLaneRate, error) {
	rows, err := q.db.QueryContext(ctx, listAllShippingLaneRates)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ShippingLaneRate{}
	for rows.Next() {
		var i ShippingLaneRate
		if err := rows.Scan(
			&i.ID, &i.OriginCity, &i.DestinationCity, &i.Fee, &i.EstimatedDays, &i.Active, &i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const getShippingLaneRateByID = `-- name: GetShippingLaneRateByID :one
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates WHERE id = ? LIMIT 1
`

func (q *Queries) GetShippingLaneRateByID(ctx context.Context, id types.BinaryUUID) (ShippingLaneRate, error) {
	row := q.db.QueryRowContext(ctx, getShippingLaneRateByID, id)
	var i ShippingLaneRate
	err := row.Scan(
		&i.ID, &i.OriginCity, &i.DestinationCity, &i.Fee, &i.EstimatedDays, &i.Active, &i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}

type CreateShippingLaneRateParams struct {
	ID              types.BinaryUUID `json:"id"`
	OriginCity      string           `json:"origin_city"`
	DestinationCity string           `json:"destination_city"`
	Fee             string           `json:"fee"`
	EstimatedDays   string           `json:"estimated_days"`
}

func (q *Queries) CreateShippingLaneRate(ctx context.Context, arg CreateShippingLaneRateParams) error {
	const query = `INSERT INTO shipping_lane_rates (id, origin_city, destination_city, fee, estimated_days, active)
VALUES (?, ?, ?, ?, ?, true)`
	_, err := q.db.ExecContext(ctx, query, arg.ID, arg.OriginCity, arg.DestinationCity, arg.Fee, arg.EstimatedDays)
	return err
}

type UpdateShippingLaneRateParams struct {
	OriginCity      string           `json:"origin_city"`
	DestinationCity string           `json:"destination_city"`
	Fee             string           `json:"fee"`
	EstimatedDays   string           `json:"estimated_days"`
	ID              types.BinaryUUID `json:"id"`
}

func (q *Queries) UpdateShippingLaneRate(ctx context.Context, arg UpdateShippingLaneRateParams) error {
	const query = `UPDATE shipping_lane_rates
SET origin_city = ?, destination_city = ?, fee = ?, estimated_days = ?, updated_at = NOW()
WHERE id = ?`
	_, err := q.db.ExecContext(ctx, query, arg.OriginCity, arg.DestinationCity, arg.Fee, arg.EstimatedDays, arg.ID)
	return err
}

type SetShippingLaneRateActiveParams struct {
	Active int16              `json:"active"`
	ID     types.BinaryUUID     `json:"id"`
}

func (q *Queries) SetShippingLaneRateActive(ctx context.Context, arg SetShippingLaneRateActiveParams) error {
	const query = `UPDATE shipping_lane_rates SET active = ?, updated_at = NOW() WHERE id = ?`
	_, err := q.db.ExecContext(ctx, query, arg.Active, arg.ID)
	return err
}

type CreateShipmentParams struct {
	ID              types.BinaryUUID  `json:"id"`
	OrderID         types.BinaryUUID  `json:"order_id"`
	VendorID        *types.BinaryUUID `json:"vendor_id"`
	ShippingFee     string            `json:"shipping_fee"`
	OriginCity      sql.NullString    `json:"origin_city"`
	DestinationCity sql.NullString    `json:"destination_city"`
	Carrier         sql.NullString    `json:"carrier"`
	TrackingNumber  sql.NullString    `json:"tracking_number"`
}

func (q *Queries) CreateShipment(ctx context.Context, arg CreateShipmentParams) error {
	const query = `INSERT INTO shipments (
  id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
  carrier, tracking_number, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
	_, err := q.db.ExecContext(ctx, query,
		arg.ID, arg.OrderID, arg.VendorID, arg.ShippingFee,
		arg.OriginCity, arg.DestinationCity, arg.Carrier, arg.TrackingNumber,
	)
	return err
}

const listShipmentsByOrder = `-- name: ListShipmentsByOrder :many
SELECT id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
       carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery, delivered_at, created_at, updated_at
FROM shipments WHERE order_id = ? ORDER BY created_at ASC
`

func (q *Queries) ListShipmentsByOrder(ctx context.Context, orderID types.BinaryUUID) ([]VendorShipment, error) {
	rows, err := q.db.QueryContext(ctx, listShipmentsByOrder, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVendorShipments(rows)
}

func scanVendorShipments(rows *sql.Rows) ([]VendorShipment, error) {
	items := []VendorShipment{}
	for rows.Next() {
		var i VendorShipment
		if err := rows.Scan(
			&i.ID, &i.OrderID, &i.VendorID, &i.ShippingFee, &i.OriginCity, &i.DestinationCity,
			&i.Carrier, &i.TrackingNumber, &i.TrackingUrl, &i.Status,
			&i.ShippedAt, &i.EstimatedDelivery, &i.DeliveredAt, &i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}
