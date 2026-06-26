// @title           Lumi Marketplace API
// @version         1.0
// @description     REST API for the Lumi fashion marketplace.
// @host            localhost:8080
// @BasePath        /
// @securityDefinitions.apikey Bearer
// @in              header
// @name            Authorization
// @description     JWT token. Enter: Bearer {your-token}
// @tag.name Guest
// @tag.description Public marketplace browsing — no login required
// @tag.name Customer
// @tag.description Signed-in shopper — checkout, orders, addresses, reviews
// @tag.name Vendor
// @tag.description Vendor store operations — products, orders, profile
// @tag.name Admin
// @tag.description Platform administration — users, vendors, moderation
// @tag.name Payment
// @tag.description Paystack payments — order checkout, verification, and webhooks
// @tag.name Subscription
// @tag.description Vendor featured listing plans — catalog, checkout, and billing history
// @tag.name Authentication
// @tag.description Login, registration, and password recovery
// @tag.name Users
// @tag.description Profile and account settings (any signed-in role)
// @tag.name Upload
// @tag.description Image uploads
package main

import (
	"context"
	"fmt"
	"log"

	"lumi-backend/internal/catalog"
	"lumi-backend/internal/config"
	"lumi-backend/internal/cron"
	"lumi-backend/internal/database"
	"lumi-backend/internal/email"
	"lumi-backend/internal/redis"
	"lumi-backend/internal/routes"
	"lumi-backend/internal/server"
	"lumi-backend/internal/store"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	email.LogSMTPStatus(cfg)
	redis.LogStatus(cfg)

	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.SQL.Close()
	defer cancel()

	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	if err := catalog.EnsureTree(context.Background(), db.Q); err != nil {
		log.Fatalf("Failed to ensure product categories: %v", err)
	}

	st := store.New(db)
	redisClient := redis.New(cfg)
	defer redisClient.Close()

	cron.StartProductFlagRefresh(ctx, st.Queries())
	cron.StartSubscriptionExpiry(ctx, st.Queries())
	srv := server.New(cfg, st)
	routes.SetupRoutes(srv.Engine, st, cfg, redisClient)

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Starting server on %s", addr)
	if err := srv.Engine.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
