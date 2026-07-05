.PHONY: help build run dev install-air test clean swagger docker-up docker-down docker-tools docker-app

# Go is often installed to /usr/local/go/bin but not added to login PATH
GO := $(or $(wildcard /usr/local/go/bin/go),$(shell command -v go 2>/dev/null),/usr/local/go/bin/go)
GO_BIN_DIR := $(patsubst %/,%,$(dir $(GO)))
GOPATH ?= $(shell "$(GO)" env GOPATH 2>/dev/null || echo $(HOME)/go)
export GO
export PATH := $(GO_BIN_DIR):$(GOPATH)/bin:$(PATH)
AIR_VERSION ?= v1.62.0
AIR ?= $(GOPATH)/bin/air

help:
	@echo "Available commands:"
	@echo "  make build              - Build the application"
	@echo "  make run                - Run the application"
	@echo "  make dev                - Run with hot reload (restarts on file changes)"
	@echo "  make install-air        - Install the air hot-reload tool"
	@echo "  make test               - Run tests"
	@echo "  make swagger            - Generate Swagger documentation"
	@echo "  make clean              - Clean build files"
	@echo "  make docker-up          - Start MySQL + Redis (optional infra)"
	@echo "  make docker-tools       - Also start phpMyAdmin"
	@echo "  make docker-app         - Run API in Docker (requires .env.docker.example or .env)"
	@echo "  make docker-down        - Stop Docker containers"
	@echo ""

build:
	@echo "Building..."
	$(GO) build -o bin/lumi-backend ./cmd/main.go

run:
	@echo "Running..."
	$(GO) run ./cmd/main.go

install-air:
	@echo "Installing air $(AIR_VERSION)..."
	$(GO) install github.com/air-verse/air@$(AIR_VERSION)

dev:
	@if [ ! -x "$(AIR)" ]; then $(MAKE) install-air; fi
	@echo "Running with hot reload (air)..."
	GO="$(GO)" PATH="$(GO_BIN_DIR):$(GOPATH)/bin:$$PATH" $(AIR)

test:
	@echo "Running tests..."
	$(GO) test ./...

swagger:
	@echo "Generating Swagger documentation..."
	$(GO) run github.com/swaggo/swag/cmd/swag init -g cmd/main.go --parseDependency --parseInternal --output docs
	python3 scripts/patch_swagger_tags.py docs/swagger.json

clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -rf docs/

docker-up:
	docker compose up -d mysql redis

docker-tools:
	docker compose --profile tools up -d

docker-app:
	docker compose --profile app up -d --build

docker-down:
	docker compose --profile tools --profile app down

sqlc:
	/tmp/sqlc generate -f sqlc.yaml
