package main

import (
	"fmt"
	"net/http"
	"reflect"
	"testing"
)

func TestAllocationsSplitsWeekByProjectAndDay(t *testing.T) {
	s := newTestServer(t)
	ana := insertPerson(t, s, "Ana", 40)
	mustExec(t, s, `INSERT INTO projects (name) VALUES ('Beacon'), ('Atlas')`)
	mustExec(t, s, `INSERT INTO assignments (person_id, project_id, start_date, end_date, hours_per_day) VALUES
		($1, (SELECT id FROM projects WHERE name = 'Atlas'),  '2026-01-05', '2026-01-09', 4),   -- Mon–Fri
		($1, (SELECT id FROM projects WHERE name = 'Atlas'),  '2026-01-07', '2026-01-07', 2),   -- Wed, same project: adds up
		($1, (SELECT id FROM projects WHERE name = 'Beacon'), '2026-01-08', '2026-01-12', 3),   -- Thu–Mon: Sat/Sun carry nothing
		($1, (SELECT id FROM projects WHERE name = 'Beacon'), '2025-12-29', '2026-01-04', 8)`, // the week before
		ana)

	var got allocationsResponse
	// A Wednesday widens to its week.
	decodeJSON(t, serve(t, s, http.MethodGet, fmt.Sprintf("/api/people/%d/allocations?week=2026-01-07", ana), ""), http.StatusOK, &got)

	want := allocationsResponse{
		Week: week{"2026-01-05", "2026-01-11"},
		Projects: []projectAllocation{ // sorted by name
			{ID: got.Projects[0].ID, Name: "Atlas", Days: []float64{4, 4, 6, 4, 4}},
			{ID: got.Projects[1].ID, Name: "Beacon", Days: []float64{0, 0, 0, 3, 3}},
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v\nwant %+v", got, want)
	}
}

func TestAllocationsRejectsBadRequests(t *testing.T) {
	s := newTestServer(t)
	ana := insertPerson(t, s, "Ana", 40)

	// `[]`, not `null`, for an empty week.
	rec := serve(t, s, http.MethodGet, fmt.Sprintf("/api/people/%d/allocations?week=2026-01-05", ana), "")
	if want := `{"week":{"start":"2026-01-05","end":"2026-01-11"},"projects":[]}` + "\n"; rec.Body.String() != want {
		t.Fatalf("body = %s, want %s", rec.Body, want)
	}

	wantError(t, serve(t, s, http.MethodGet, "/api/people/999999/allocations?week=2026-01-05", ""), http.StatusNotFound, "person not found")
	wantError(t, serve(t, s, http.MethodGet, "/api/people/ana/allocations?week=2026-01-05", ""), http.StatusBadRequest, "positive integer")
	wantError(t, serve(t, s, http.MethodGet, fmt.Sprintf("/api/people/%d/allocations", ana), ""), http.StatusBadRequest, "week is required")
	wantError(t, serve(t, s, http.MethodGet, fmt.Sprintf("/api/people/%d/allocations?week=next", ana), ""), http.StatusBadRequest, "week must be a date")
}
