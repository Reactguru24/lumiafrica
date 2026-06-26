-- name: GetIdempotencyKey :one
SELECT * FROM idempotency_keys WHERE key_hash = ? LIMIT 1;

-- name: CreateIdempotencyKey :exec
INSERT INTO idempotency_keys (
  id, key_hash, user_id, endpoint, request_hash, expires_at
) VALUES (?, ?, ?, ?, ?, ?);

-- name: LockIdempotencyKey :execrows
UPDATE idempotency_keys
SET locked_at = NOW()
WHERE id = ? AND completed_at IS NULL AND locked_at IS NULL;

-- name: CompleteIdempotencyKey :exec
UPDATE idempotency_keys
SET response_code = ?, response_body = ?, completed_at = NOW()
WHERE id = ?;
