package redis

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"

	goredis "github.com/redis/go-redis/v9"
)

// Client wraps an optional Redis connection. When disabled or unreachable, all
// operations no-op and the API continues to work without a cache layer.
type Client struct {
	enabled bool
	rdb     *goredis.Client
}

func New(cfg *config.Config) *Client {
	if !cfg.RedisEnabled {
		return &Client{}
	}

	addr := strings.TrimSpace(cfg.RedisAddr)
	if addr == "" {
		log.Println("[REDIS] REDIS_ENABLED but REDIS_ADDR is empty — continuing without Redis")
		return &Client{}
	}

	rdb := goredis.NewClient(&goredis.Options{
		Addr:     addr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[REDIS] ping failed (%s): %v — continuing without Redis", addr, err)
		_ = rdb.Close()
		return &Client{}
	}

	log.Printf("[REDIS] connected: %s (db %d)", addr, cfg.RedisDB)
	return &Client{enabled: true, rdb: rdb}
}

func LogStatus(cfg *config.Config) {
	if !cfg.RedisEnabled {
		log.Println("[REDIS] not enabled — app runs without cache")
		return
	}
	log.Printf("[REDIS] enabled — target %s (db %d)", cfg.RedisAddr, cfg.RedisDB)
}

func (c *Client) Enabled() bool {
	return c != nil && c.enabled && c.rdb != nil
}

func (c *Client) Ping(ctx context.Context) error {
	if !c.Enabled() {
		return nil
	}
	return c.rdb.Ping(ctx).Err()
}

func (c *Client) Close() error {
	if c == nil || c.rdb == nil {
		return nil
	}
	return c.rdb.Close()
}
