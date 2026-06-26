package store

import (
	"lumi-backend/internal/database"
	"lumi-backend/internal/database/sqlc"
)

type Store struct {
	db *database.DB
	q  *sqlc.Queries
}

func New(db *database.DB) *Store {
	return &Store{db: db, q: db.Q}
}

func (s *Store) Queries() *sqlc.Queries {
	return s.q
}

func (s *Store) DB() *database.DB {
	return s.db
}
