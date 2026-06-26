FROM golang:1.25-alpine AS builder

WORKDIR /src
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/lumi-backend ./cmd/main.go

FROM alpine:3.21

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app && adduser -S app -G app

COPY --from=builder /out/lumi-backend /app/lumi-backend
COPY --from=builder /src/internal/email/templates /app/internal/email/templates
COPY db/ /app/db/

RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

EXPOSE 8080
CMD ["/app/lumi-backend"]
