# Lumi Africa — Backend API

Go REST API for the Lumi fashion marketplace: Gin, MySQL, sqlc, JWT auth, Paystack, Swagger.

## Stack

- **Go 1.21+** · **Gin** · **MySQL 8** · **Redis 7** (optional cache)
- **sqlc** — type-safe SQL (no ORM)
- **JWT** — authentication
- **Swagger** — OpenAPI docs at `/swagger/index.html`

## Project structure

```
backend/
├── cmd/
│   ├── main.go           # API server entry
│   └── seeder/main.go    # Database seeder
├── db/queries/           # sqlc SQL sources
├── internal/
│   ├── config/
│   ├── database/         # DB connection + migrations
│   ├── database/sqlc/    # Generated query code
│   ├── handlers/         # HTTP handlers
│   ├── middleware/       # Auth, CORS
│   ├── models/
│   ├── routes/
│   ├── store/            # sqlc → domain converters
│   ├── seeder/
│   └── cron/             # Product flag refresh (trending, etc.)
├── docs/                 # Generated swagger.json
├── Makefile
└── .env.example
```

## Setup

**Default (no Docker):** use a local MySQL instance.

```bash
cd backend
cp .env.example .env
# Edit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

go mod download
make run        # production-style run
make dev        # hot reload via air
```

### Optional: Docker for MySQL + Redis

Docker is **not required**. Use it only if you prefer containerized infra:

```bash
cd backend
make docker-up          # MySQL (3306) + Redis (6379)
make docker-tools       # also phpMyAdmin on http://localhost:8081
```

Point `.env` at the containers when running the API on your host:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=lumi_marketplace

REDIS_ENABLED=true
REDIS_ADDR=127.0.0.1:6379
```

To run the API in Docker as well (fully optional):

```bash
cp .env.docker.example .env   # or merge Redis/DB vars into your .env
make docker-app               # builds and starts api + mysql + redis
```

Stop everything with `make docker-down`.

`GET /health` reports database and Redis status (used by the API container healthcheck when running `make docker-app`).

## Environment variables

```env
SERVER_PORT=8080
SERVER_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lumi_marketplace

JWT_SECRET=change-me-in-production
JWT_EXPIRY=24h

CORS_ORIGINS=http://localhost:3000

# Optional Redis (cache layer — app works when disabled or unreachable)
REDIS_ENABLED=false
REDIS_ADDR=127.0.0.1:6379
REDIS_PASSWORD=
REDIS_DB=0
```

When enabled, Redis caches `GET /products/filters` and `GET /products/homepage` (short TTL). Product create/update/moderation clears the catalog cache.

Paystack keys (subscriptions / payments) are also read from `.env` — see `.env.example`.

## Vendor application approval

When an admin approves a vendor application:

1. A **separate vendor user** is created on the application **business email**; the applicant stays **`CUSTOMER`**.
2. A **24-hour activation link** is emailed to the business email (`internal/email/templates/vendor_approved.html`).
3. The vendor signs in with the **business email** after setting a password.
4. Admins can **resend activation** while `activationPending` is true; the link is revoked once the password is set.
5. In development without SMTP, approve/resend responses may include `resetUrl`.

### SMTP (optional)

```env
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@lumiafrica.com
SMTP_FROM_NAME=Lumi Africa
```

If SMTP is not configured, email content is logged to the server console.

## Seeding

```bash
go run ./cmd/seeder/main.go
```

Idempotent: skips users, vendors, products, orders, and reviews that already exist. Safe to re-run after partial failures.

**Demo logins** (after seed):

| Email | Password | Role |
|-------|----------|------|
| admin@lumiafrica.com | admin123 | ADMIN |
| vendor@lumiafrica.com | vendor123 | VENDOR |
| customer@lumiafrica.com | customer123 | CUSTOMER |

## API overview

### Public (Guest)

- `POST /auth/login`, `/auth/register`
- `GET /products`, `/products/filters`, `/products/:id`
- `GET /products/homepage` (+ `/featured`, `/trending`, `/bestsellers`, `/new-arrivals`)
- `GET /vendors`, `/vendors/featured`, `/vendors/:id`
- `GET /subscriptions/plans`

### Customer

- Orders, addresses, reviews, vendor applications, Paystack checkout

### Vendor

- `/vendor/products`, `/vendor/orders`, profile, analytics, subscriptions

### Admin

- Users, vendors, orders, products, subscriptions, analytics, platform settings

Swagger groups: **Guest**, **Authentication**, **Customer**, **Vendor**, **Admin**, **Payment**, **Subscription**.

## Product search query params

| Param | Description |
|-------|-------------|
| `q`, `search` | Text search |
| `category`, `subcategory`, `gender`, `brand` | Catalog filters |
| `vendorId`, `size`, `color` | Vendor / variant filters |
| `minPrice`, `maxPrice`, `minRating` | Range filters |
| `featured`, `trending`, `bestseller`, `newArrival`, `onSale` | Boolean flags (`true`) |
| `sort` | `newest`, `popular`, `rating`, `trending`, `bestsellers`, `price-asc`, `price-desc` |
| `page`, `limit` | Pagination |

## sqlc

SQL lives in `db/queries/*.sql`. After editing queries:

```bash
sqlc generate -f sqlc.yaml
```

If sqlc is not installed, update `internal/database/sqlc/*.sql.go` manually to match.

## Make targets

```bash
make build      # compile to bin/lumi-backend
make run        # run server
make dev        # air hot reload
make swagger    # regenerate docs + patch tags
make test
make docker-up  # optional: MySQL + Redis via docker compose
```

## Response format

Success:

```json
{ "code": 200, "message": "Success", "data": { } }
```

Error:

```json
{ "code": 400, "message": "Invalid request" }
```

## Security

- bcrypt password hashing
- JWT bearer tokens
- Role middleware (ADMIN, VENDOR, CUSTOMER)
- Parameterized SQL via sqlc

## License

MIT
