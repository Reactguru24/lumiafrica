-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = ? LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = ? LIMIT 1;

-- name: CreateUser :exec
INSERT INTO users (id, full_name, email, phone, password, role, disabled)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdateUserProfile :exec
UPDATE users
SET full_name = COALESCE(sqlc.narg('full_name'), full_name),
    phone = COALESCE(sqlc.narg('phone'), phone),
    avatar = COALESCE(sqlc.narg('avatar'), avatar)
WHERE id = sqlc.arg('id');

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: ListUsers :many
SELECT id, full_name, email, phone, role, avatar, disabled, created_at, updated_at
FROM users
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: DisableUser :exec
UPDATE users SET disabled = true WHERE id = ?;

-- name: EnableUser :exec
UPDATE users SET disabled = false WHERE id = ?;

-- name: UpdateUserRole :exec
UPDATE users SET role = ? WHERE id = ?;

-- name: CreateAddress :exec
INSERT INTO addresses (id, user_id, label, street, city, state, country, zip_code, is_default)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: ListAddressesByUser :many
SELECT * FROM addresses WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC;

-- name: GetAddressByIDAndUser :one
SELECT * FROM addresses WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;

-- name: SoftDeleteAddress :exec
UPDATE addresses SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL;

-- name: UpdateUserPassword :exec
UPDATE users SET password = ? WHERE id = ?;

-- name: MarkUserPasswordSet :exec
UPDATE users SET password_set_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: UserHasUsedPasswordResetToken :one
SELECT EXISTS(
  SELECT 1 FROM password_reset_tokens WHERE user_id = ? AND used = TRUE
) AS has_used;

-- name: CreatePasswordResetToken :exec
INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
VALUES (?, ?, ?, ?);

-- name: GetPasswordResetToken :one
SELECT * FROM password_reset_tokens WHERE token = ? AND used = false AND expires_at > NOW() LIMIT 1;

-- name: MarkPasswordResetTokenUsed :exec
UPDATE password_reset_tokens SET used = true WHERE id = ?;

-- name: InvalidateUserResetTokens :exec
UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false;
