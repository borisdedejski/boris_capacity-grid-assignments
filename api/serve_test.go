package main

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

// serve sends one request through the real mux and returns the recorded response.
func serve(t *testing.T, s *server, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	s.routes().ServeHTTP(rec, req)
	return rec
}

// decodeJSON fails the test unless the response has the wanted status and a
// body that decodes into v.
func decodeJSON(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, v any) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, wantStatus, rec.Body)
	}
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("decode %s: %v", rec.Body, err)
	}
}

// wantError fails the test unless the response has the wanted status and its
// plain-text body contains msg.
func wantError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, msg string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, wantStatus, rec.Body)
	}
	if !strings.Contains(rec.Body.String(), msg) {
		t.Fatalf("body = %q, want it to contain %q", rec.Body.String(), msg)
	}
}
