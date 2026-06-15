// @title           Lumi Marketplace API
// @version         1.0
// @description     REST API for the Lumi fashion marketplace.
// @host            localhost:8080
// @BasePath        /
// @securityDefinitions.apikey Bearer
// @in              header
// @name            Authorization
// @description     JWT token. Enter: Bearer {your-token}
package main

import (
	"fmt"
	"log"

	"lumi-backend/internal/config"
	"lumi-backend/internal/database"
	"lumi-backend/internal/routes"
	"lumi-backend/internal/server"
	"lumi-backend/internal/store"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.SQL.Close()

	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	st := store.New(db)
	srv := server.New(cfg, st)
	routes.SetupRoutes(srv.Engine, st, cfg)

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Starting server on %s", addr)
	if err := srv.Engine.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
