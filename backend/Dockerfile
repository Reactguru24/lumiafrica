FROM golang:1.26 AS builder

WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Regenerate sqlc if missing (e.g. when deploy upload skipped generated files).
RUN if [ ! -f internal/database/sqlc/db.go ]; then \
      go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 && \
      sqlc generate -f sqlc.yaml; \
    fi

RUN CGO_ENABLED=0 GOOS=linux go build -o /out/lumi-backend ./cmd/main.go

FROM debian:bookworm-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app --create-home app

COPY --from=builder /out/lumi-backend /app/lumi-backend
COPY --from=builder /src/internal/email/templates /app/internal/email/templates
COPY db/ /app/db/

RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

EXPOSE 8080
CMD ["/app/lumi-backend"]
