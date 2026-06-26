package handlers

import (
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/storage"
	"github.com/Reactguru24/lumiafrica/internal/utils"

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

// UploadDocument godoc
// @Summary Upload application document
// @Description Upload an image or PDF for vendor applications (no auth required)
// @Tags Upload
// @Accept multipart/form-data
// @Param file formData file true "Document file"
// @Success 200 {object} map[string]string
// @Router /uploads/documents [post]
func UploadDocument(cfg *config.Config) gin.HandlerFunc {
	svc := storage.New(cfg)
	return func(c *gin.Context) {
		result := svc.HandleDocumentUpload(c)
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
