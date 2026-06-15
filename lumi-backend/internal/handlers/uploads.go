package handlers

import (
	"lumi-backend/internal/config"
	"lumi-backend/internal/storage"
	"lumi-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// UploadImage godoc
// @Summary Upload image
// @Description Upload an image to Cloudinary when configured, otherwise local disk
// @Tags Upload
// @Accept multipart/form-data
// @Param file formData file true "Image file"
// @Success 200 {object} map[string]string
// @Security Bearer
// @Router /auth/upload [post]
func UploadImage(cfg *config.Config) gin.HandlerFunc {
	svc := storage.New(cfg)
	return func(c *gin.Context) {
		result := svc.HandleUpload(c)
		if result == nil {
			return
		}
		utils.Success(c, gin.H{
			"url":      result.URL,
			"filename": result.Filename,
			"size":     result.Size,
			"mimeType": result.MimeType,
		})
	}
}
