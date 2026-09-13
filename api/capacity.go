package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

// Capacity is reported per person, per week.
//
//   - A week runs Monday to Sunday. The requested range is widened to whole
//     weeks, and the response says which weeks it covers.
//   - Allocated hours count weekdays only: an assignment's hours_per_day applies
//     to each Monday–Friday it covers, and to every assignment active that day.
//   - Capacity for every week is the person's weekly_hours.

const (
	dateLayout = "2006-01-02"
	maxWeeks   = 53 // a full year, whichever weekday it starts on
)

type capacityResponse struct {
	Weeks  []week           `json:"weeks"`
	People []personCapacity `json:"people"`
}

type week struct {
	Start string `json:"start"` // Monday
	End   string `json:"end"`   // Sunday
}

type personCapacity struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	WeeklyHours float64   `json:"weeklyHours"`
	Allocated   []float64 `json:"allocated"` // one entry per week, in the order of weeks
}

// capacityQuery takes the Mondays of the weeks to report ($1) and returns one
// row per person with their allocated hours for each of those weeks.
//
// The join keeps every assignment that touches the week's Monday–Friday, so the
// intersection it multiplies by is at least one day. Rounding to two decimals
// keeps binary float noise out of the JSON.
const capacityQuery = `
WITH weeks AS (
  SELECT unnest($1::date[]) AS week_start
),
allocated AS (
  SELECT a.person_id, w.week_start,
         sum(a.hours_per_day * (least(a.end_date, w.week_start + 4) - greatest(a.start_date, w.week_start) + 1)) AS hours
  FROM weeks w
  JOIN assignments a ON a.start_date <= w.week_start + 4 AND a.end_date >= w.week_start
  GROUP BY a.person_id, w.week_start
)
SELECT p.id, p.name, p.weekly_hours::float8,
       array_agg(round(coalesce(al.hours, 0), 2)::float8 ORDER BY w.week_start) AS allocated
FROM people p
CROSS JOIN weeks w
LEFT JOIN allocated al ON al.person_id = p.id AND al.week_start = w.week_start
GROUP BY p.id
ORDER BY p.name, p.id
`

// handleCapacity serves GET /api/capacity?from=YYYY-MM-DD&to=YYYY-MM-DD
func (s *server) handleCapacity(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	from, err := parseDate(q.Get("from"))
	if err != nil {
		http.Error(w, "from "+err.Error(), http.StatusBadRequest)
		return
	}
	to, err := parseDate(q.Get("to"))
	if err != nil {
		http.Error(w, "to "+err.Error(), http.StatusBadRequest)
		return
	}
	weekStarts, err := weeksCovering(from, to)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	people, err := s.capacityByWeek(r.Context(), weekStarts)
	if err != nil {
		log.Printf("capacity: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	weeks := make([]week, len(weekStarts))
	for i, monday := range weekStarts {
		weeks[i] = week{
			Start: monday.Format(dateLayout),
			End:   monday.AddDate(0, 0, 6).Format(dateLayout),
		}
	}
	writeJSON(w, http.StatusOK, capacityResponse{Weeks: weeks, People: people})
}

func (s *server) capacityByWeek(ctx context.Context, weekStarts []time.Time) ([]personCapacity, error) {
	rows, err := s.db.Query(ctx, capacityQuery, weekStarts)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[personCapacity])
}

func parseDate(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, errors.New("is required (YYYY-MM-DD)")
	}
	d, err := time.Parse(dateLayout, s)
	if err != nil {
		return time.Time{}, errors.New("must be a date (YYYY-MM-DD)")
	}
	return d, nil
}

// weeksCovering returns the Monday of every week that overlaps [from, to].
func weeksCovering(from, to time.Time) ([]time.Time, error) {
	if to.Before(from) {
		return nil, errors.New("from must be on or before to")
	}
	first, last := mondayOf(from), mondayOf(to)
	n := int(last.Sub(first).Hours()/(24*7)) + 1
	if n > maxWeeks {
		return nil, fmt.Errorf("range must cover at most %d weeks", maxWeeks)
	}
	weeks := make([]time.Time, n)
	for i := range weeks {
		weeks[i] = first.AddDate(0, 0, 7*i)
	}
	return weeks, nil
}

// mondayOf returns the Monday on or before d.
func mondayOf(d time.Time) time.Time {
	sinceMonday := (int(d.Weekday()) + 6) % 7 // Monday = 0 … Sunday = 6
	return d.AddDate(0, 0, -sinceMonday)
}
