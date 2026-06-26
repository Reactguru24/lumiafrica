package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort             string
	ServerEnv              string
	DBHost                 string
	DBPort                 string
	DBUser                 string
	DBPassword             string
	DBName                 string
	JWTSecret              string
	JWTExpiry              string
	MaxUploadSize          int64
	CORSOrigins            []string
	CloudinaryCloudName    string
	CloudinaryAPIKey       string
	CloudinaryAPISecret    string
	PaystackSecretKey      string
	PaystackPublicKey      string
	PaystackCallbackURL    string
	FrontendURL            string
	SMTPHost               string
	SMTPPort               int
	SMTPUser               string
	SMTPPassword           string
	SMTPFromEmail          string
	SMTPFromName           string
	RedisEnabled           bool
	RedisAddr              string
	RedisPassword          string
	RedisDB                int
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// In development, .env overrides existing shell env so local edits take effect after restart.
	if os.Getenv("SERVER_ENV") == "" || os.Getenv("SERVER_ENV") == "development" {
		_ = godotenv.Overload()
	} else {
		_ = godotenv.Load()
	}

	cfg := &Config{
		ServerPort:    getEnv("PORT", getEnv("SERVER_PORT", "8080")),
		ServerEnv:     getEnv("SERVER_ENV", "development"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "3306"),
		DBUser:        getEnv("DB_USER", "root"),
		DBPassword:    getEnv("DB_PASSWORD", "root"),
		DBName:        getEnv("DB_NAME", "lumi_marketplace"),
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpiry:     getEnv("JWT_EXPIRY", "24h"),
		MaxUploadSize:       10485760, // 10MB
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
		PaystackSecretKey:   getEnv("PAYSTACK_SECRET_KEY", ""),
		PaystackPublicKey:   getEnv("PAYSTACK_PUBLIC_KEY", ""),
		PaystackCallbackURL: getEnv("PAYSTACK_CALLBACK_URL", "http://localhost:3000/payment/callback"),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		SMTPHost:            getEnv("SMTP_HOST", ""),
		SMTPPort:            smtpPort(getEnv("SMTP_PORT", "587")),
		SMTPUser:            getEnv("SMTP_USER", ""),
		SMTPPassword:        normalizeSMTPPassword(getEnv("SMTP_PASSWORD", "")),
		SMTPFromEmail:       getEnv("SMTP_FROM_EMAIL", ""),
		SMTPFromName:        getEnv("SMTP_FROM_NAME", "Lumi Africa"),
		RedisEnabled:        redisEnabled(getEnv("REDIS_ENABLED", "false")),
		RedisAddr:           getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", ""),
		RedisDB:             redisDB(getEnv("REDIS_DB", "0")),
	}
	cfg.CORSOrigins = parseCORSOrigins(getEnv("CORS_ORIGINS", ""), cfg.FrontendURL)

	// Validate required config
	if cfg.JWTSecret == "your-secret-key" && cfg.ServerEnv == "production" {
		return nil, fmt.Errorf("JWT_SECRET must be set in production")
	}

	return cfg, nil
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func smtpPort(value string) int {
	port, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || port <= 0 {
		return 587
	}
	return port
}

// Gmail app passwords are often copied with spaces; strip them for SMTP auth.
func normalizeSMTPPassword(value string) string {
	return strings.ReplaceAll(strings.TrimSpace(value), " ", "")
}

func redisEnabled(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func redisDB(value string) int {
	db, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || db < 0 {
		return 0
	}
	return db
}

func parseCORSOrigins(raw, frontendURL string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.Contains(raw, "{") {
		return []string{frontendURL, "http://localhost:3000", "http://127.0.0.1:3000"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin == "" {
			continue
		}
		if _, ok := seen[origin]; ok {
			continue
		}
		seen[origin] = struct{}{}
		out = append(out, origin)
	}
	if len(out) == 0 {
		return []string{frontendURL}
	}
	return out
}
