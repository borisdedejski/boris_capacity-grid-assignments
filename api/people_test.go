package main

import (
	"fmt"
	"net/http"
	"reflect"
	"testing"
)

func TestUpdatePersonChangesWeeklyHours(t *testing.T) {
	s := newTestServer(t)
	ana := insertPerson(t, s, "Ana", 40)
	insertAssignment(t, s, ana, "2026-01-05", "2026-01-09", 8)

	var got person
	decodeJSON(t, serve(t, s, http.MethodPatch, fmt.Sprintf("/api/people/%d", ana), `{"weeklyHours": 37.5}`), http.StatusOK, &got)

	if want := (person{ID: ana, Name: "Ana", WeeklyHours: 37.5}); got != want {
		t.Fatalf("got %+v, want %+v", got, want)
	}
	// The grid reads the new capacity on its next fetch, with allocations untouched.
	cap := getCapacity(t, s, "2026-01-05", "2026-01-11")
	if want := []personCapacity{{ID: ana, Name: "Ana", WeeklyHours: 37.5, Allocated: []float64{40}}}; !reflect.DeepEqual(cap.People, want) {
		t.Fatalf("capacity after update = %+v, want %+v", cap.People, want)
	}
}

func TestUpdatePersonRejectsBadRequests(t *testing.T) {
	s := newTestServer(t)
	ana := insertPerson(t, s, "Ana", 40)
	path := fmt.Sprintf("/api/people/%d", ana)

	tests := []struct {
		name, path, body string
		status           int
		msg              string
	}{
		{"unknown person", "/api/people/999999", `{"weeklyHours": 32}`, http.StatusNotFound, "person not found"},
		{"malformed id", "/api/people/ana", `{"weeklyHours": 32}`, http.StatusBadRequest, "positive integer"},
		{"empty body", path, ``, http.StatusBadRequest, "invalid body"},
		{"not json", path, `weeklyHours=32`, http.StatusBadRequest, "invalid body"},
		{"wrong type", path, `{"weeklyHours": "32"}`, http.StatusBadRequest, "invalid body"},
		{"missing field", path, `{}`, http.StatusBadRequest, "weeklyHours is required"},
		{"misspelt field", path, `{"weekly_hours": 32}`, http.StatusBadRequest, "unknown field"},
		{"negative", path, `{"weeklyHours": -1}`, http.StatusBadRequest, "between 0 and 168"},
		{"more than a week", path, `{"weeklyHours": 169}`, http.StatusBadRequest, "between 0 and 168"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wantError(t, serve(t, s, http.MethodPatch, tt.path, tt.body), tt.status, tt.msg)
		})
	}

	// None of the above touched the row.
	var hours float64
	if err := s.db.QueryRow(t.Context(), `SELECT weekly_hours::float8 FROM people WHERE id = $1`, ana).Scan(&hours); err != nil || hours != 40 {
		t.Fatalf("weekly_hours = %v (err %v), want 40", hours, err)
	}
}
