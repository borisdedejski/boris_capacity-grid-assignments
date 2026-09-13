package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCountsPeople(t *testing.T) {
	s := newTestServer(t)
	mustExec(t, s, `INSERT INTO people (name, weekly_hours) VALUES ('Ana', 40), ('Bo', 32)`)

	rec := httptest.NewRecorder()
	s.routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
	}
	var got struct {
		OK     bool `json:"ok"`
		People int  `json:"people"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// 2, not the 500 seeded people: the test schema is isolated.
	if !got.OK || got.People != 2 {
		t.Fatalf("got %+v, want ok with 2 people", got)
	}
}
