package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/redis"
	"github.com/gin-gonic/gin"
)

const rateLimitWindow = 60 * time.Second

var rateLimitRules = map[string]int{
	"login":             5,
	"register":          3,
	"forgot-password":   3,
	"check-credentials": 10,
	"reset-password":    5,
	"vendor-application": 3,
	"upload-document":   5,
}

func getRedisClient(c *gin.Context) *redis.Client {
	if rc, ok := c.Get("redis"); ok {
		if client, ok := rc.(*redis.Client); ok {
			return client
		}
	}
	return nil
}

func getClientIP(c *gin.Context) string {
	ip := c.ClientIP()
	if ip == "" {
		ip = c.Request.RemoteAddr
	}
	return ip
}

// RateLimit returns a middleware that limits requests per IP for a given action.
// When Redis is disabled or unavailable, requests pass through unthrottled.
func RateLimit(action string) gin.HandlerFunc {
	maxRequests, ok := rateLimitRules[action]
	if !ok {
		return func(c *gin.Context) { c.Next() }
	}

	return func(c *gin.Context) {
		rc := getRedisClient(c)
		if rc == nil || !rc.Enabled() {
			c.Next()
			return
		}

		ip := getClientIP(c)
		if ip == "" {
			c.Next()
			return
		}

		window := time.Now().Unix() / 60
		key := fmt.Sprintf("lumi:ratelimit:%s:%s:%d", action, ip, window)

		ctx := c.Request.Context()
		count, err := rc.Incr(ctx, key)
		if err != nil {
			c.Next()
			return
		}

		if count == 1 {
			_ = rc.Expire(ctx, key, rateLimitWindow+time.Minute)
		}

		if count > int64(maxRequests) {
			c.Header("Retry-After", "60")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
