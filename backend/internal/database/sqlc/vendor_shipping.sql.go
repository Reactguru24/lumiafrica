package sqlc

import (
	"context"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/types"
)

const listVendorShippingRatesByVendor = `-- name: ListVendorShippingRatesByVendor :many
SELECT vsr.id, vsr.vendor_id, vsr.zone_id, vsr.fee, vsr.created_at, vsr.updated_at,
       dz.name AS zone_name, dz.estimated_days AS zone_estimated_days
FROM vendor_shipping_rates vsr
INNER JOIN delivery_zones dz ON dz.id = vsr.zone_id
WHERE vsr.vendor_id = ?
ORDER BY dz.name
`

type ListVendorShippingRatesByVendorRow struct {
	ID                types.BinaryUUID `json:"id"`
	VendorID          types.BinaryUUID `json:"vendor_id"`
	ZoneID            types.BinaryUUID `json:"zone_id"`
	Fee               string           `json:"fee"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
	ZoneName          string           `json:"zone_name"`
	ZoneEstimatedDays string           `json:"zone_estimated_days"`
}

func (q *Queries) ListVendorShippingRatesByVendor(ctx context.Context, vendorID types.BinaryUUID) ([]ListVendorShippingRatesByVendorRow, error) {
	rows, err := q.db.QueryContext(ctx, listVendorShippingRatesByVendor, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ListVendorShippingRatesByVendorRow{}
	for rows.Next() {
		var i ListVendorShippingRatesByVendorRow
		if err := rows.Scan(
			&i.ID, &i.VendorID, &i.ZoneID, &i.Fee, &i.CreatedAt, &i.UpdatedAt,
			&i.ZoneName, &i.ZoneEstimatedDays,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const getVendorShippingRate = `-- name: GetVendorShippingRate :one
SELECT id, vendor_id, zone_id, fee, created_at, updated_at
FROM vendor_shipping_rates
WHERE vendor_id = ? AND zone_id = ?
LIMIT 1
`

type VendorShippingRate struct {
	ID        types.BinaryUUID `json:"id"`
	VendorID  types.BinaryUUID `json:"vendor_id"`
	ZoneID    types.BinaryUUID `json:"zone_id"`
	Fee       string           `json:"fee"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

func (q *Queries) GetVendorShippingRate(ctx context.Context, vendorID, zoneID types.BinaryUUID) (VendorShippingRate, error) {
	row := q.db.QueryRowContext(ctx, getVendorShippingRate, vendorID, zoneID)
	var i VendorShippingRate
	err := row.Scan(&i.ID, &i.VendorID, &i.ZoneID, &i.Fee, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

const upsertVendorShippingRate = `-- name: UpsertVendorShippingRate :exec
INSERT INTO vendor_shipping_rates (id, vendor_id, zone_id, fee)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE fee = VALUES(fee)
`

type UpsertVendorShippingRateParams struct {
	ID       types.BinaryUUID `json:"id"`
	VendorID types.BinaryUUID `json:"vendor_id"`
	ZoneID   types.BinaryUUID `json:"zone_id"`
	Fee      string           `json:"fee"`
}

func (q *Queries) UpsertVendorShippingRate(ctx context.Context, arg UpsertVendorShippingRateParams) error {
	_, err := q.db.ExecContext(ctx, upsertVendorShippingRate, arg.ID, arg.VendorID, arg.ZoneID, arg.Fee)
	return err
}

const deleteVendorShippingRate = `-- name: DeleteVendorShippingRate :exec
DELETE FROM vendor_shipping_rates WHERE vendor_id = ? AND zone_id = ?
`

type DeleteVendorShippingRateParams struct {
	VendorID types.BinaryUUID `json:"vendor_id"`
	ZoneID   types.BinaryUUID `json:"zone_id"`
}

func (q *Queries) DeleteVendorShippingRate(ctx context.Context, arg DeleteVendorShippingRateParams) error {
	_, err := q.db.ExecContext(ctx, deleteVendorShippingRate, arg.VendorID, arg.ZoneID)
	return err
}
