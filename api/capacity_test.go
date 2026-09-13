package main

import (
	"fmt"
	"net/http"
	"reflect"
	"testing"
)

// The fixtures below all sit in January 2026: Monday 2026-01-05 starts the
// first week, Monday 2026-01-12 the second.

func insertPerson(t *testing.T, s *server, name string, weeklyHours float64) int {
	t.Helper()
	var id int
	err := s.db.QueryRow(t.Context(),
		`INSERT INTO people (name, weekly_hours) VALUES ($1, $2) RETURNING id`, name, weeklyHours).Scan(&id)
	if err != nil {
		t.Fatalf("insert person: %v", err)
	}
	return id
}

func insertAssignment(t *testing.T, s *server, personID int, start, end string, hoursPerDay float64) {
	t.Helper()
	mustExec(t, s, `INSERT INTO projects (name) VALUES ('P') ON CONFLICT DO NOTHING`)
	mustExec(t, s, `INSERT INTO assignments (person_id, project_id, start_date, end_date, hours_per_day)
	                VALUES ($1, (SELECT min(id) FROM projects), $2, $3, $4)`, personID, start, end, hoursPerDay)
}

func getCapacity(t *testing.T, s *server, from, to string) capacityResponse {
	t.Helper()
	var got capacityResponse
	decodeJSON(t, serve(t, s, http.MethodGet, fmt.Sprintf("/api/capacity?from=%s&to=%s", from, to), ""), http.StatusOK, &got)
	return got
}

func TestCapacitySumsWeekdayHoursOfEveryAssignment(t *testing.T) {
	s := newTestServer(t)
	bo := insertPerson(t, s, "Bo", 20)
	ana := insertPerson(t, s, "Ana", 40)
	insertAssignment(t, s, ana, "2026-01-05", "2026-01-09", 8) // Mon–Fri: 40
	insertAssignment(t, s, ana, "2026-01-05", "2026-01-07", 2) // Mon–Wed on top: 6 more, so over
	insertAssignment(t, s, ana, "2026-01-12", "2026-01-25", 1) // two weeks: 5 each
	insertAssignment(t, s, ana, "2025-12-29", "2026-01-04", 8) // the week before: not in range
	insertAssignment(t, s, bo, "2026-01-19", "2026-01-23", 4)  // the week after: not in range

	got := getCapacity(t, s, "2026-01-05", "2026-01-18")

	want := capacityResponse{
		Weeks: []week{{"2026-01-05", "2026-01-11"}, {"2026-01-12", "2026-01-18"}},
		People: []personCapacity{ // sorted by name, with a zero for every empty week
			{ID: ana, Name: "Ana", WeeklyHours: 40, Allocated: []float64{46, 5}},
			{ID: bo, Name: "Bo", WeeklyHours: 20, Allocated: []float64{0, 0}},
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v\nwant %+v", got, want)
	}
}

func TestCapacityCountsWeekdaysOnly(t *testing.T) {
	s := newTestServer(t)
	bo := insertPerson(t, s, "Bo", 40)
	dee := insertPerson(t, s, "Dee", 40)
	insertAssignment(t, s, bo, "2026-01-09", "2026-01-12", 8)    // Fri–Mon: 8 in each week, nothing for Sat/Sun
	insertAssignment(t, s, dee, "2026-01-07", "2026-01-09", 5)   // Wed–Fri: 15
	insertAssignment(t, s, dee, "2026-01-17", "2026-01-18", 8)   // Sat–Sun only: nothing
	insertAssignment(t, s, dee, "2026-01-16", "2026-01-16", 0.5) // a single Friday

	got := getCapacity(t, s, "2026-01-05", "2026-01-18")

	want := []personCapacity{
		{ID: bo, Name: "Bo", WeeklyHours: 40, Allocated: []float64{8, 8}},
		{ID: dee, Name: "Dee", WeeklyHours: 40, Allocated: []float64{15, 0.5}},
	}
	if !reflect.DeepEqual(got.People, want) {
		t.Fatalf("got %+v\nwant %+v", got.People, want)
	}
}

func TestCapacityWidensRangeToWholeWeeks(t *testing.T) {
	s := newTestServer(t)
	ana := insertPerson(t, s, "Ana", 40)
	insertAssignment(t, s, ana, "2026-01-05", "2026-01-05", 8) // the Monday before `from`
	insertAssignment(t, s, ana, "2026-01-16", "2026-01-16", 8) // the Friday after `to`

	got := getCapacity(t, s, "2026-01-07", "2026-01-15") // Wednesday to Thursday

	wantWeeks := []week{{"2026-01-05", "2026-01-11"}, {"2026-01-12", "2026-01-18"}}
	if !reflect.DeepEqual(got.Weeks, wantWeeks) {
		t.Fatalf("weeks = %+v, want %+v", got.Weeks, wantWeeks)
	}
	if want := []float64{8, 8}; !reflect.DeepEqual(got.People[0].Allocated, want) {
		t.Fatalf("allocated = %v, want %v (whole weeks, not just the days asked for)", got.People[0].Allocated, want)
	}

	// A single day is still a whole week.
	if got := getCapacity(t, s, "2026-01-11", "2026-01-11"); !reflect.DeepEqual(got.Weeks, wantWeeks[:1]) {
		t.Fatalf("weeks = %+v, want %+v", got.Weeks, wantWeeks[:1])
	}
}

func TestCapacityReportsZeroCapacityAsIs(t *testing.T) {
	s := newTestServer(t)
	eli := insertPerson(t, s, "Eli", 0)
	insertAssignment(t, s, eli, "2026-01-05", "2026-01-09", 4)

	got := getCapacity(t, s, "2026-01-05", "2026-01-11")

	want := []personCapacity{{ID: eli, Name: "Eli", WeeklyHours: 0, Allocated: []float64{20}}}
	if !reflect.DeepEqual(got.People, want) {
		t.Fatalf("got %+v\nwant %+v", got.People, want)
	}
}

func TestCapacityWithNoPeople(t *testing.T) {
	s := newTestServer(t)

	rec := serve(t, s, http.MethodGet, "/api/capacity?from=2026-01-05&to=2026-01-11", "")

	// `[]`, not `null`: the grid iterates over it.
	if want := `{"weeks":[{"start":"2026-01-05","end":"2026-01-11"}],"people":[]}` + "\n"; rec.Body.String() != want {
		t.Fatalf("body = %s, want %s", rec.Body, want)
	}
}

func TestCapacityRejectsBadRanges(t *testing.T) {
	s := newTestServer(t)
	tests := []struct {
		name, query, msg string
	}{
		{"missing from", "to=2026-01-11", "from is required"},
		{"missing to", "from=2026-01-05", "to is required"},
		{"malformed from", "from=05/01/2026&to=2026-01-11", "from must be a date"},
		{"malformed to", "from=2026-01-05&to=2026-1-11", "to must be a date"},
		{"from after to", "from=2026-01-12&to=2026-01-11", "from must be on or before to"},
		{"54 weeks", "from=2026-01-05&to=2027-01-11", "at most 53 weeks"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wantError(t, serve(t, s, http.MethodGet, "/api/capacity?"+tt.query, ""), http.StatusBadRequest, tt.msg)
		})
	}

	// 53 weeks is the most a request may ask for, and it still works.
	if got := getCapacity(t, s, "2026-01-05", "2027-01-10"); len(got.Weeks) != 53 {
		t.Fatalf("got %d weeks, want 53", len(got.Weeks))
	}
}
