package config

import (
	"fmt"
	"os"

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
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
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
	}

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
