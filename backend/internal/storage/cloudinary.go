package storage

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/cloudinary/cloudinary-go"
	"github.com/cloudinary/cloudinary-go/api/uploader"
	"github.com/gin-gonic/gin"
)

var allowedImageMimes = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

var allowedDocumentMimes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/jpg":       ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

type Service struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

type UploadResult struct {
	URL      string
	Filename string
	Size     int64
	MimeType string
}

func (s *Service) HandleUpload(c *gin.Context) *UploadResult {
	file, err := c.FormFile("file")
	if err != nil {
		utils.Error(c, 400, "missing file: "+err.Error())
		return nil
	}
	if s.cfg.MaxUploadSize > 0 && file.Size > s.cfg.MaxUploadSize {
		utils.Error(c, 413, fmt.Sprintf("file too large (max %d bytes)", s.cfg.MaxUploadSize))
		return nil
	}
	src, err := file.Open()
	if err != nil {
		utils.Error(c, 500, "open error: "+err.Error())
		return nil
	}
	defer src.Close()

	mimeType, ext := resolveImageType(file.Filename, file.Header.Get("Content-Type"))
	if mimeType == "" {
		utils.Error(c, 400, "unsupported file type. Use JPEG, PNG, or WebP")
		return nil
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()

	u, err := s.uploadFile(ctx, src, file.Filename, mimeType, ext)
	if err != nil {
		utils.Error(c, 500, "upload error: "+err.Error())
		return nil
	}
	return u
}

func (s *Service) HandleDocumentUpload(c *gin.Context) *UploadResult {
	file, err := c.FormFile("file")
	if err != nil {
		utils.Error(c, 400, "missing file: "+err.Error())
		return nil
	}
	if s.cfg.MaxUploadSize > 0 && file.Size > s.cfg.MaxUploadSize {
		utils.Error(c, 413, fmt.Sprintf("file too large (max %d bytes)", s.cfg.MaxUploadSize))
		return nil
	}
	src, err := file.Open()
	if err != nil {
		utils.Error(c, 500, "open error: "+err.Error())
		return nil
	}
	defer src.Close()

	mimeType, ext := resolveDocumentType(file.Filename, file.Header.Get("Content-Type"))
	if mimeType == "" {
		utils.Error(c, 400, "unsupported file type. Use JPEG, PNG, WebP, or PDF")
		return nil
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()

	data, err := io.ReadAll(src)
	if err != nil {
		utils.Error(c, 500, "read error: "+err.Error())
		return nil
	}
	if len(data) == 0 {
		utils.Error(c, 400, "empty file")
		return nil
	}

	if mimeType == "application/pdf" {
		u, err := s.uploadLocal(data, file.Filename, mimeType, ext)
		if err != nil {
			utils.Error(c, 500, "upload error: "+err.Error())
			return nil
		}
		return u
	}

	u, err := s.uploadFile(ctx, bytes.NewReader(data), file.Filename, mimeType, ext)
	if err != nil {
		utils.Error(c, 500, "upload error: "+err.Error())
		return nil
	}
	return u
}

func resolveDocumentType(filename, headerMime string) (mimeType, ext string) {
	headerMime = strings.ToLower(strings.TrimSpace(strings.Split(headerMime, ";")[0]))
	if e, ok := allowedDocumentMimes[headerMime]; ok {
		return headerMime, e
	}

	fileExt := strings.ToLower(filepath.Ext(filename))
	switch fileExt {
	case ".jpg", ".jpeg":
		return "image/jpeg", ".jpg"
	case ".png":
		return "image/png", ".png"
	case ".webp":
		return "image/webp", ".webp"
	case ".pdf":
		return "application/pdf", ".pdf"
	}

	if byExt := mime.TypeByExtension(fileExt); byExt != "" {
		if e, ok := allowedDocumentMimes[byExt]; ok {
			return byExt, e
		}
	}
	return "", ""
}

func resolveImageType(filename, headerMime string) (mimeType, ext string) {
	headerMime = strings.ToLower(strings.TrimSpace(strings.Split(headerMime, ";")[0]))
	if e, ok := allowedImageMimes[headerMime]; ok {
		return headerMime, e
	}

	fileExt := strings.ToLower(filepath.Ext(filename))
	switch fileExt {
	case ".jpg", ".jpeg":
		return "image/jpeg", ".jpg"
	case ".png":
		return "image/png", ".png"
	case ".webp":
		return "image/webp", ".webp"
	}

	if byExt := mime.TypeByExtension(fileExt); byExt != "" {
		if e, ok := allowedImageMimes[byExt]; ok {
			return byExt, e
		}
	}
	return "", ""
}

func (s *Service) uploadFile(ctx context.Context, src io.Reader, filename, mimeType, ext string) (*UploadResult, error) {
	data, err := io.ReadAll(src)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, fmt.Errorf("empty file")
	}

	if s.cfg.CloudinaryCloudName != "" && s.cfg.CloudinaryAPIKey != "" && s.cfg.CloudinaryAPISecret != "" {
		result, err := s.uploadCloudinary(ctx, data, filename, mimeType, ext)
		if err == nil {
			return result, nil
		}
		if strings.Contains(strings.ToLower(err.Error()), "unsupported file type") {
			return s.uploadLocal(data, filename, mimeType, ext)
		}
		return nil, err
	}
	return s.uploadLocal(data, filename, mimeType, ext)
}

func (s *Service) uploadCloudinary(ctx context.Context, data []byte, filename, mimeType, ext string) (*UploadResult, error) {
	cld, err := cloudinary.NewFromParams(
		s.cfg.CloudinaryCloudName,
		s.cfg.CloudinaryAPIKey,
		s.cfg.CloudinaryAPISecret,
	)
	if err != nil {
		return nil, fmt.Errorf("init cloudinary: %w", err)
	}

	publicID := fmt.Sprintf("%d_%s", time.Now().UnixNano(), randHex(8))
	resp, err := cld.Upload.Upload(ctx, data, uploader.UploadParams{
		PublicID:     publicID,
		Folder:       "lumi",
		ResourceType: "image",
		Format:       cloudinaryFormat(mimeType),
	})
	if err != nil {
		return nil, fmt.Errorf("cloudinary upload: %w", err)
	}

	secureURL := resp.SecureURL
	if secureURL == "" {
		secureURL = resp.URL
	}

	return &UploadResult{
		URL:      secureURL,
		Filename: filename,
		Size:     int64(len(data)),
		MimeType: mimeType,
	}, nil
}

func cloudinaryFormat(mimeType string) string {
	switch mimeType {
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func (s *Service) uploadLocal(data []byte, filename, mimeType, ext string) (*UploadResult, error) {
	if ext == "" {
		ext = ".jpg"
	}
	name := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randHex(8), ext)
	fullPath := filepath.Join("uploads", name)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return nil, err
	}
	if err := os.WriteFile(fullPath, data, 0o644); err != nil {
		return nil, err
	}
	return &UploadResult{
		URL:      fmt.Sprintf("/uploads/%s", name),
		Filename: filename,
		Size:     int64(len(data)),
		MimeType: mimeType,
	}, nil
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
