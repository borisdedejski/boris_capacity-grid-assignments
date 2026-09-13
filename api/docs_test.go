package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDocsRoutes(t *testing.T) {
	routes := (&server{}).routes() // the docs don't touch the database
	tests := []struct {
		path, contentType, contains string
	}{
		{"/api/docs", "text/html; charset=utf-8", "url: '/api/openapi.yaml'"},
		{"/api/openapi.yaml", "application/yaml", "openapi: 3.1.0"},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := httptest.NewRecorder()
			routes.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, tt.path, nil))

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", rec.Code)
			}
			if got := rec.Header().Get("Content-Type"); got != tt.contentType {
				t.Errorf("Content-Type = %q, want %q", got, tt.contentType)
			}
			if !strings.Contains(rec.Body.String(), tt.contains) {
				t.Errorf("body does not contain %q", tt.contains)
			}
		})
	}
}
