package server

import (
	"lumi-backend/internal/config"
	"lumi-backend/internal/store"

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

func corsMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
