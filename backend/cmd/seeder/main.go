// @title           Lumi Marketplace Seeder
package main

import (
	"flag"
	"log"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database"
	"github.com/Reactguru24/lumiafrica/internal/seeder"
)

func main() {
	seedOnly := flag.Bool("seed", true, "Run full seeder")
	adminOnly := flag.Bool("admin", false, "Seed only the admin account")
	flag.Parse()

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

	if *adminOnly {
		if err := seeder.SeedAdmin(db); err != nil {
			log.Fatalf("Failed to seed admin: %v", err)
		}
		return
	}

	if *seedOnly {
		if err := seeder.SeedAll(db); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
	}
}