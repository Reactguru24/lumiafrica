package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/go-sql-driver/mysql"

	"lumi-backend/internal/config"
	"lumi-backend/internal/database/sqlc"

	_ "github.com/go-sql-driver/mysql"
)

type DB struct {
	SQL *sql.DB
	Q   *sqlc.Queries
}

func Open(cfg *config.Config) (*DB, error) {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Println("Database connected successfully")
	return &DB{
		SQL: sqlDB,
		Q:   sqlc.New(sqlDB),
	}, nil
}

func Migrate(db *DB) error {
	schemaPath := "db/schema.sql"
	data, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("read schema: %w", err)
	}

	log.Println("Running schema migration...")
	for _, stmt := range splitSQLStatements(string(data)) {
		if _, err := db.SQL.ExecContext(context.Background(), stmt); err != nil {
			if isIgnorableSchemaError(err) {
				continue
			}
			return fmt.Errorf("execute schema statement: %w", err)
		}
	}

	if _, err := db.SQL.ExecContext(context.Background(),
		"UPDATE vendors SET social_links = '[]' WHERE social_links IS NULL"); err != nil {
		return fmt.Errorf("normalize vendor social_links: %w", err)
	}

	log.Println("Schema migration complete")
	return nil
}

func splitSQLStatements(sqlText string) []string {
	var statements []string
	for _, part := range strings.Split(sqlText, ";") {
		stmt := strings.TrimSpace(part)
		if stmt != "" {
			statements = append(statements, stmt)
		}
	}
	return statements
}

func isIgnorableSchemaError(err error) bool {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		switch mysqlErr.Number {
		case 1050, 1060, 1061, 1062: // table/column/index already exists
			return true
		}
	}
	return false
}
