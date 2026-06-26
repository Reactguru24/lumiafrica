-- name: GetVendorByID :one
SELECT * FROM vendors WHERE id = ? AND suspended = false LIMIT 1;

-- name: GetVendorByUserID :one
SELECT * FROM vendors WHERE user_id = ? LIMIT 1;

-- name: SearchVendors :many
SELECT * FROM vendors
WHERE suspended = false
ORDER BY rating DESC, created_at DESC
LIMIT ? OFFSET ?;

-- name: CountSearchVendors :one
SELECT COUNT(*) FROM vendors WHERE suspended = false;

-- name: CreateVendor :exec
INSERT INTO vendors (
  id, user_id, store_name, slug, description, logo, banner,
  contact_phone, business_email, country, city, social_links
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateVendorProfile :exec
UPDATE vendors
SET store_name = COALESCE(sqlc.narg('store_name'), store_name),
    description = COALESCE(sqlc.narg('description'), description),
    logo = COALESCE(sqlc.narg('logo'), logo),
    banner = COALESCE(sqlc.narg('banner'), banner),
    contact_phone = COALESCE(sqlc.narg('contact_phone'), contact_phone),
    business_email = COALESCE(sqlc.narg('business_email'), business_email),
    country = COALESCE(sqlc.narg('country'), country),
    city = COALESCE(sqlc.narg('city'), city),
    social_links = COALESCE(sqlc.narg('social_links'), social_links)
WHERE user_id = sqlc.arg('user_id');

-- name: GetVendorByBusinessEmail :one
SELECT * FROM vendors WHERE LOWER(business_email) = LOWER(?) LIMIT 1;

-- name: GetVendorByIDAdmin :one
SELECT * FROM vendors WHERE id = ? LIMIT 1;

-- name: GetApprovedApplicationByBusinessEmail :one
SELECT * FROM vendor_applications
WHERE LOWER(business_email) = LOWER(?) AND status = 'approved'
ORDER BY reviewed_at DESC
LIMIT 1;

-- name: GetPendingApplicationByUser :one
SELECT * FROM vendor_applications WHERE user_id = ? AND status = 'pending' LIMIT 1;

-- name: GetPendingApplicationByBusinessEmail :one
SELECT * FROM vendor_applications WHERE LOWER(business_email) = LOWER(?) AND status = 'pending' LIMIT 1;

-- name: GetLatestApplicationByUser :one
SELECT * FROM vendor_applications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1;

-- name: GetLatestApplicationByBusinessEmail :one
SELECT * FROM vendor_applications
WHERE LOWER(business_email) = LOWER(?)
ORDER BY submitted_at DESC
LIMIT 1;

-- name: CreateVendorApplication :exec
INSERT INTO vendor_applications (
  id, user_id, applicant_name, store_name, business_description, logo,
  business_certificate, vendor_photo, business_photo,
  business_email, contact_phone, country, city, registration_number, categories, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');

-- name: ListPendingApplications :many
SELECT * FROM vendor_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC
LIMIT ? OFFSET ?;

-- name: CountPendingApplications :one
SELECT COUNT(*) FROM vendor_applications WHERE status = 'pending';

-- name: GetApplicationByID :one
SELECT * FROM vendor_applications WHERE id = ? LIMIT 1;

-- name: ApproveApplication :exec
UPDATE vendor_applications
SET status = 'approved', review_note = ?, reviewed_at = ?
WHERE id = ?;

-- name: RejectApplication :exec
UPDATE vendor_applications
SET status = 'rejected', review_note = ?, reviewed_at = ?
WHERE id = ?;

-- name: FeatureVendor :exec
UPDATE vendors SET is_featured = ? WHERE id = ?;

-- name: GetFeaturedVendors :many
SELECT DISTINCT v.* FROM vendors v
INNER JOIN vendor_subscriptions vs ON v.id = vs.vendor_id
WHERE v.suspended = false
  AND v.is_featured = true
  AND vs.active = true
  AND vs.expires_at > NOW()
ORDER BY v.rating DESC, vs.plan DESC
LIMIT ?;

-- name: UpdateVendorRating :exec
UPDATE vendors SET rating = ? WHERE id = ?;

-- name: ListVendorsAdmin :many
SELECT * FROM vendors ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: CountVendorsAdmin :one
SELECT COUNT(*) FROM vendors;

-- name: InsertVendorCategory :exec
INSERT IGNORE INTO vendor_categories (vendor_id, category_id) VALUES (?, ?);

-- name: ListVendorCategoryIDs :many
SELECT category_id FROM vendor_categories WHERE vendor_id = ?;
