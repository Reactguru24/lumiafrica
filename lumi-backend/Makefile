.PHONY: help build run test clean swagger docker-up docker-down seed seed-all seed-users seed-vendors seed-products seed-orders seed-reviews seed-clear

# Go is often installed to /usr/local/go/bin but not added to login PATH
export PATH := /usr/local/go/bin:$(PATH)
GO ?= go

help:
	@echo "Available commands:"
	@echo "  make build              - Build the application"
	@echo "  make run                - Run the application"
	@echo "  make test               - Run tests"
	@echo "  make swagger            - Generate Swagger documentation"
	@echo "  make clean              - Clean build files"
	@echo "  make docker-up          - Start Docker containers"
	@echo "  make docker-down        - Stop Docker containers"
	@echo ""
	@echo "  Seed commands:"
	@echo "  make seed-all           - Seed entire database (500 users, 20 vendors, 110+ products)"
	@echo "  make seed-clear         - Clear and reseed entire database"
	@echo "  make seed-users         - Seed only users"
	@echo "  make seed-vendors       - Seed only vendors"
	@echo "  make seed-products      - Seed only products"
	@echo "  make seed-orders        - Seed only orders"
	@echo "  make seed-reviews       - Seed only reviews"

build:
	@echo "Building..."
	$(GO) build -o bin/lumi-backend ./cmd/main.go

run:
	@echo "Running..."
	$(GO) run ./cmd/main.go

test:
	@echo "Running tests..."
	$(GO) test ./...

swagger:
	@echo "Generating Swagger documentation..."
	$(GO) run github.com/swaggo/swag/cmd/swag init -g cmd/main.go --parseDependency --parseInternal --output docs

clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -rf docs/

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

dev:
	@echo "Running in development mode with hot reload..."
	$(GO) run ./cmd/main.go

sqlc:
	/tmp/sqlc generate -f sqlc.yaml

seed-all:
	@echo "Seeding database with all data..."
	$(GO) run ./seeders/ -type=all

seed-clear:
	@echo "Clearing and reseeding database..."
	$(GO) run ./seeders/ -type=all -clear=true

seed-users:
	@echo "Seeding users..."
	$(GO) run ./seeders/ -type=users -users=500
