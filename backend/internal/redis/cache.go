package redis

import (
	"context"
	"encoding/json"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const catalogCacheTTL = 5 * time.Minute

// GetJSON loads a cached JSON value. Returns found=false when Redis is disabled or the key is missing.
func (c *Client) GetJSON(ctx context.Context, key string, dest interface{}) (found bool, err error) {
	if !c.Enabled() {
		return false, nil
	}

	data, err := c.rdb.Get(ctx, key).Bytes()
	if err == goredis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return false, err
	}
	return true, nil
}

// SetJSON stores a JSON value with the given TTL.
func (c *Client) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if !c.Enabled() {
		return nil
	}
	if ttl <= 0 {
		ttl = catalogCacheTTL
	}
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, data, ttl).Err()
}

// Delete removes one or more keys.
func (c *Client) Delete(ctx context.Context, keys ...string) error {
	if !c.Enabled() || len(keys) == 0 {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}

// InvalidateCatalog drops cached product filters and homepage payloads.
func (c *Client) InvalidateCatalog(ctx context.Context) error {
	if !c.Enabled() {
		return nil
	}

	if err := c.Delete(ctx, KeyProductFilters); err != nil {
		return err
	}

	var cursor uint64
	for {
		keys, next, err := c.rdb.Scan(ctx, cursor, keyHomepagePrefix+"*", 100).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := c.rdb.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return nil
}
