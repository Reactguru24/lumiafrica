package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-sql-driver/mysql"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"

	_ "github.com/go-sql-driver/mysql"
)

type DB struct {
	SQL *sql.DB
	Q   *sqlc.Queries
}

func Open(cfg *config.Config) (*DB, error) {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local&multiStatements=true",
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
	schemaPath := "db/schema_v2.sql"
	data, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("read schema: %w", err)
	}

	log.Println("Running schema v2 migration...")
	if err := execSQLStatements(db, string(data)); err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1005 {
			return fmt.Errorf("%w\nHint: existing legacy tables likely conflict with schema_v2 types (e.g. users.id). Drop and recreate the database, then rerun migration", err)
		}
		return err
	}

	log.Println("Schema v2 migration complete")

	migrationDir := "db/migrations"
	entries, err := os.ReadDir(migrationDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(migrationDir, entry.Name()))
	}
	sort.Strings(files)

	for _, path := range files {
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}
		log.Printf("Running migration %s...", filepath.Base(path))
		if err := execMigrationFile(db, string(data)); err != nil {
			return fmt.Errorf("migration %s: %w", filepath.Base(path), err)
		}
	}

	log.Println("Incremental migrations complete")
	return nil
}

func execMigrationFile(db *DB, sqlText string) error {
	conn, err := db.SQL.Conn(context.Background())
	if err != nil {
		return fmt.Errorf("acquire connection: %w", err)
	}
	defer conn.Close()

	for _, stmt := range splitSQLStatements(stripSQLComments(sqlText)) {
		if stmt == "" {
			continue
		}
		if _, err := conn.ExecContext(context.Background(), stmt); err != nil {
			if isIgnorableSchemaError(err) {
				continue
			}
			return fmt.Errorf("execute statement: %w\nSQL: %s", err, truncate(stmt, 200))
		}
	}
	return nil
}

func stripSQLComments(sqlText string) string {
	var b strings.Builder
	for _, line := range strings.Split(sqlText, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	return b.String()
}

func execSQLStatements(db *DB, sqlText string) error {
	for _, stmt := range splitSQLStatements(sqlText) {
		if stmt == "" {
			continue
		}
		if _, err := db.SQL.ExecContext(context.Background(), stmt); err != nil {
			if isIgnorableSchemaError(err) {
				continue
			}
			return fmt.Errorf("execute statement: %w\nSQL: %s", err, truncate(stmt, 200))
		}
	}
	return nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

func splitSQLStatements(sqlText string) []string {
	var statements []string
	var current strings.Builder
	for _, line := range strings.Split(sqlText, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		current.WriteString(line)
		current.WriteByte('\n')
		if strings.HasSuffix(strings.TrimSpace(line), ";") {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" && stmt != ";" {
				statements = append(statements, stmt)
			}
			current.Reset()
		}
	}
	rest := strings.TrimSpace(current.String())
	if rest != "" {
		statements = append(statements, rest)
	}
	return statements
}

func isIgnorableSchemaError(err error) bool {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		switch mysqlErr.Number {
		case 1060, 1061, 1062, 1064, 1091, 1826:
			return true
		}
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already exists") ||
		strings.Contains(msg, "duplicate foreign key") ||
		strings.Contains(msg, "errno: 121")
}
