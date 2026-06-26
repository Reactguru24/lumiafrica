package middleware

import (
	"lumi-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

const (
	GuestSessionCookie = "lumi_guest_session"
	GuestSessionHeader = "X-Guest-Session"
)

// GuestSessionMiddleware ensures every shopper has a stable guest session ID.
func GuestSessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		guestID, _ := c.Cookie(GuestSessionCookie)
		if guestID == "" {
			guestID = c.GetHeader(GuestSessionHeader)
		}
		if guestID == "" {
			guestID = utils.GenerateID()
		}
		c.Set("guest_session_id", guestID)
		c.Header(GuestSessionHeader, guestID)
		c.SetCookie(GuestSessionCookie, guestID, 60*60*24*30, "/", "", false, false)
		c.Next()
	}
}

func GetGuestSessionID(c *gin.Context) string {
	if id, ok := c.Get("guest_session_id"); ok {
		if s, ok := id.(string); ok {
			return s
		}
	}
	return ""
}
