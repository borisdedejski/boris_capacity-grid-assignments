package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// newTestServer returns a server backed by its own empty Postgres schema, built
// from db/schema.sql and dropped when the test ends. Tests never read or modify
// the seeded data, and each one inserts exactly the rows it asserts on.
func newTestServer(t *testing.T) *server {
	t.Helper()
	ctx := context.Background()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is not set; run the API tests with scripts/test.sh")
	}
	ddl, err := os.ReadFile(filepath.Join("..", "db", "schema.sql"))
	if err != nil {
		t.Fatalf("read schema: %v", err)
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("parse DATABASE_URL: %v", err)
	}
	schema := fmt.Sprintf("test_%d", time.Now().UnixNano())
	cfg.ConnConfig.RuntimeParams["search_path"] = schema

	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(db.Close)

	ident := pgx.Identifier{schema}.Sanitize()
	if _, err := db.Exec(ctx, "CREATE SCHEMA "+ident); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec(context.Background(), "DROP SCHEMA "+ident+" CASCADE"); err != nil {
			t.Errorf("drop schema: %v", err)
		}
	})
	if _, err := db.Exec(ctx, string(ddl)); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	return &server{db: db}
}

// mustExec runs a fixture statement against the test schema.
func mustExec(t *testing.T, s *server, sql string, args ...any) {
	t.Helper()
	if _, err := s.db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}
