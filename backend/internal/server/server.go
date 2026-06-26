package server

import (
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/store"

	"github.com/gin-gonic/gin"
)

type Server struct {
	Engine *gin.Engine
	Store  *store.Store
	Config *config.Config
}

func New(cfg *config.Config, st *store.Store) *Server {
	if cfg.ServerEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.Default()
	engine.Use(corsMiddleware(cfg))

	return &Server{
		Engine: engine,
		Store:  st,
		Config: cfg,
	}
}

var corsAllowedHeaders = strings.Join([]string{
	"Content-Type",
	"Content-Length",
	"Accept-Encoding",
	"X-CSRF-Token",
	"Authorization",
	"accept",
	"origin",
	"Cache-Control",
	"X-Requested-With",
	"X-Guest-Session",
	"Idempotency-Key",
}, ", ")

func corsMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" && isOriginAllowed(origin, cfg) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", corsAllowedHeaders)
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Guest-Session")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func isOriginAllowed(origin string, cfg *config.Config) bool {
	for _, allowed := range cfg.CORSOrigins {
		if origin == allowed {
			return true
		}
	}
	if cfg.ServerEnv == "development" {
		return strings.HasPrefix(origin, "http://localhost:") ||
			strings.HasPrefix(origin, "http://127.0.0.1:")
	}
	return false
}
