package middleware

import (
	"lumi-backend/internal/config"
	"lumi-backend/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// OptionalAuthMiddleware parses JWT when present but allows anonymous access.
func OptionalAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.Next()
			return
		}
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})
		if err == nil && token.Valid {
			c.Set("user_id", claims.UserID)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("authenticated", true)
		}
		c.Next()
	}
}

func IsAuthenticated(c *gin.Context) bool {
	v, ok := c.Get("authenticated")
	return ok && v.(bool)
}

func OptionalUserID(c *gin.Context) (string, bool) {
	if !IsAuthenticated(c) {
		return "", false
	}
	id, ok := c.Get("user_id")
	if !ok {
		return "", false
	}
	s, ok := id.(string)
	return s, ok && s != ""
}

func GetRoleIfAuthenticated(c *gin.Context) (models.UserRole, bool) {
	if !IsAuthenticated(c) {
		return "", false
	}
	role, ok := c.Get("role")
	if !ok {
		return "", false
	}
	r, ok := role.(models.UserRole)
	return r, ok
}
