package handlers

import (
	"net/http"

	"github.com/Reactguru24/lumiafrica/internal/redis"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func getRedis(c *gin.Context) *redis.Client {
	v, ok := c.Get("redis")
	if !ok || v == nil {
		return &redis.Client{}
	}
	return v.(*redis.Client)
}

func invalidateCatalogCache(c *gin.Context) {
	if err := getRedis(c).InvalidateCatalog(c.Request.Context()); err != nil {
		// Cache invalidation is best-effort; stale data expires via TTL.
		_ = err
	}
}

type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

// Health godoc
// @Summary Health check
// @Description Reports database and optional Redis connectivity for load balancers and Docker.
// @Tags Guest
// @Produce json
// @Success 200 {object} handlers.healthResponse
// @Failure 503 {object} handlers.healthResponse
// @Router /health [get]
func Health() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		st := c.MustGet("store").(*store.Store)
		rc := getRedis(c)

		resp := healthResponse{
			Status:   "ok",
			Database: "up",
			Redis:    redisStatus(rc),
		}

		if err := st.DB().SQL.PingContext(ctx); err != nil {
			resp.Status = "degraded"
			resp.Database = "down"
			c.JSON(http.StatusServiceUnavailable, resp)
			return
		}

		if rc.Enabled() {
			if err := rc.Ping(ctx); err != nil {
				resp.Status = "degraded"
				resp.Redis = "down"
				c.JSON(http.StatusServiceUnavailable, resp)
				return
			}
		}

		utils.Success(c, resp)
	}
}

func redisStatus(rc *redis.Client) string {
	if rc == nil || !rc.Enabled() {
		return "disabled"
	}
	return "up"
}
