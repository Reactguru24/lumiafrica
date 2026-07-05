// @title           Lumi Marketplace Seeder
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database"
	"github.com/Reactguru24/lumiafrica/internal/seeder"
)

func main() {
	seedOnly := flag.Bool("seed", true, "Run full seeder")
	adminOnly := flag.Bool("admin", false, "Seed only the admin account")
	vendorProductsOnly := flag.Bool("vendor-products", false, "Seed 20 products per approved vendor across UI categories")
	skipMigrate := flag.Bool("skip-migrate", false, "Skip database migrations (use on production when schema is already applied)")
	flag.Parse()

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.Open(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\nDatabase connection failed (%s:%s).\n\n", cfg.DBHost, cfg.DBPort)
		fmt.Fprintln(os.Stderr, "The seeder needs a running MySQL database. Choose one option:")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  A) Local Docker MySQL (from repo root):")
		fmt.Fprintln(os.Stderr, "     docker compose up -d mysql")
		fmt.Fprintln(os.Stderr, "     cp backend/.env.example backend/.env")
		fmt.Fprintln(os.Stderr, "     # set DB_USER=root DB_PASSWORD=root DB_HOST=127.0.0.1")
		fmt.Fprintln(os.Stderr, "     cd backend && make seed-vendor-products")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  B) Railway production MySQL (recommended if vendors are on live):")
		fmt.Fprintln(os.Stderr, "     Copy MySQL vars from Railway dashboard into backend/.env")
		fmt.Fprintln(os.Stderr, "     (MYSQLHOST → DB_HOST, MYSQLPASSWORD → DB_PASSWORD, etc.)")
		fmt.Fprintln(os.Stderr, "     cd backend && make seed-vendor-products")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  C) Run inside Railway (uses service env automatically):")
		fmt.Fprintln(os.Stderr, "     npm run seed:vendor-products")
		fmt.Fprintln(os.Stderr, "")
		log.Fatalf("Original error: %v", err)
	}
	defer db.SQL.Close()

	if !*skipMigrate {
		if err := database.Migrate(db); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	}

	if *adminOnly {
		if err := seeder.SeedAdmin(db); err != nil {
			log.Fatalf("Failed to seed admin: %v", err)
		}
		return
	}

	if *vendorProductsOnly {
		if err := seeder.SeedApprovedVendorProducts(db, cfg); err != nil {
			log.Fatalf("Failed to seed vendor products: %v", err)
		}
		return
	}

	if *seedOnly {
		if err := seeder.SeedAll(db); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
	}
}