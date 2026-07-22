-- name: ListVendorPayoutMethods :many
SELECT * FROM vendor_payout_methods
WHERE vendor_id = ?
ORDER BY is_default DESC, created_at ASC;

-- name: GetVendorPayoutMethodByID :one
SELECT * FROM vendor_payout_methods
WHERE id = ? AND vendor_id = ?
LIMIT 1;

-- name: GetDefaultVendorMpesaMethod :one
SELECT * FROM vendor_payout_methods
WHERE vendor_id = ? AND type = 'mpesa' AND is_default = 1
LIMIT 1;

-- name: ClearVendorDefaultPayoutMethods :exec
UPDATE vendor_payout_methods SET is_default = 0 WHERE vendor_id = ?;

-- name: ClearVendorMpesaRecipientCodes :exec
UPDATE vendor_payout_methods SET bank_name = NULL WHERE vendor_id = ? AND type = 'mpesa';

-- name: CreateVendorPayoutMethod :exec
INSERT INTO vendor_payout_methods (
  id, vendor_id, type, account_name, account_ref, is_default
) VALUES (?, ?, 'mpesa', ?, ?, ?);

-- name: GetVendorAvailableBalance :one
SELECT COALESCE(SUM(oi.vendor_earnings), 0) AS balance
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE oi.vendor_id = ?
  AND o.status = 'delivered'
  AND NOT EXISTS (
    SELECT 1 FROM vendor_payout_items vpi WHERE vpi.order_item_id = oi.id
  );

-- name: ListPayableOrderItems :many
SELECT oi.id, oi.vendor_earnings, o.delivered_at
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE oi.vendor_id = ?
  AND o.status = 'delivered'
  AND NOT EXISTS (
    SELECT 1 FROM vendor_payout_items vpi WHERE vpi.order_item_id = oi.id
  )
ORDER BY o.delivered_at ASC;

-- name: CreateVendorPayout :exec
INSERT INTO vendor_payouts (
  id, vendor_id, payout_method_id, amount, currency, status,
  period_start, period_end, reference, initiated_at
) VALUES (?, ?, ?, ?, 'KES', ?, ?, ?, ?, NOW());

-- name: CreateVendorPayoutItem :exec
INSERT INTO vendor_payout_items (payout_id, order_item_id, amount)
VALUES (?, ?, ?);

-- name: ListVendorPayouts :many
SELECT * FROM vendor_payouts
WHERE vendor_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountVendorPayouts :one
SELECT COUNT(*) FROM vendor_payouts WHERE vendor_id = ?;

-- name: UpdateVendorPayoutMethodRecipient :exec
UPDATE vendor_payout_methods SET bank_name = ? WHERE id = ? AND vendor_id = ?;

-- name: UpdateVendorPayoutStatus :exec
UPDATE vendor_payouts
SET status = ?,
    reference = ?,
    completed_at = CASE WHEN ? = 'paid' THEN NOW() ELSE completed_at END,
    admin_note = COALESCE(?, admin_note)
WHERE id = ?;

-- name: GetDefaultVendorBankTransferMethod :one
SELECT * FROM vendor_payout_methods
WHERE vendor_id = ? AND type = 'bank_transfer' AND is_default = 1
LIMIT 1;

-- name: CreateVendorBankTransferMethod :exec
INSERT INTO vendor_payout_methods (
  id, vendor_id, type, account_name, account_ref, bank_account_number, bank_routing_number, bank_currency, is_default
) VALUES (?, ?, 'bank_transfer', ?, ?, ?, ?, ?, ?);

-- name: UpdateVendorBankTransferMethod :exec
UPDATE vendor_payout_methods
SET account_name = ?, bank_account_number = ?, bank_routing_number = ?, bank_currency = ?, is_default = ?
WHERE id = ? AND vendor_id = ?;

-- name: DeleteVendorPayoutMethod :exec
DELETE FROM vendor_payout_methods WHERE id = ? AND vendor_id = ?;

-- name: CountVendorPayoutMethods :one
SELECT COUNT(*) FROM vendor_payout_methods WHERE vendor_id = ?;

-- name: GetDefaultVendorPayoutMethod :one
SELECT * FROM vendor_payout_methods
WHERE vendor_id = ? AND is_default = 1
LIMIT 1;
