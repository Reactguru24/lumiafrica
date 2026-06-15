package utils

import (
	"github.com/gin-gonic/gin"
)

func Success(c *gin.Context, data interface{}) {
	c.JSON(200, data)
}

func SuccessCreated(c *gin.Context, data interface{}) {
	c.JSON(201, data)
}

func SuccessPaginated(c *gin.Context, data interface{}, total int64, page, limit int) {
	c.JSON(200, gin.H{
		"data":  data,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

type PaginatedResponse struct {
	Data  interface{} `json:"data"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

func Error(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{"error": message})
}
