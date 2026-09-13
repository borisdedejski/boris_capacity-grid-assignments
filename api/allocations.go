package main

import (
	"log"
	"net/http"
	"time"
)

// handleAllocations serves GET /api/people/{id}/allocations?week=YYYY-MM-DD:
// what fills one person's week, per project and per weekday. `week` may be
// any day; it is widened to the Monday–Sunday week containing it, and only
// Monday–Friday carry hours, the same rule as /api/capacity.

type allocationsResponse struct {
	Week     week                `json:"week"`
	Projects []projectAllocation `json:"projects"`
}

type projectAllocation struct {
	ID   int       `json:"id"`
	Name string    `json:"name"`
	Days []float64 `json:"days"` // Monday to Friday
}

// allocationsQuery takes a person ($1) and a Monday ($2) and returns one row
// per project and weekday with hours scheduled.
const allocationsQuery = `
SELECT pr.id, pr.name, d.day - $2::date AS weekday, round(sum(a.hours_per_day), 2)::float8
FROM (SELECT gs::date AS day FROM generate_series($2::date, $2::date + 4, interval '1 day') gs) d
JOIN assignments a ON a.person_id = $1 AND a.start_date <= d.day AND a.end_date >= d.day
JOIN projects pr ON pr.id = a.project_id
GROUP BY pr.id, pr.name, d.day
ORDER BY pr.name, pr.id, d.day
`

func (s *server) handleAllocations(w http.ResponseWriter, r *http.Request) {
	id, err := personID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	day, err := parseDate(r.URL.Query().Get("week"))
	if err != nil {
		http.Error(w, "week "+err.Error(), http.StatusBadRequest)
		return
	}
	monday := mondayOf(day)

	var exists bool
	if err := s.db.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM people WHERE id = $1)`, id).Scan(&exists); err != nil {
		log.Printf("allocations for person %d: %v", id, err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "person not found", http.StatusNotFound)
		return
	}

	projects, err := s.allocationsByProject(r, id, monday)
	if err != nil {
		log.Printf("allocations for person %d: %v", id, err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, allocationsResponse{
		Week:     week{Start: monday.Format(dateLayout), End: monday.AddDate(0, 0, 6).Format(dateLayout)},
		Projects: projects,
	})
}

func (s *server) allocationsByProject(r *http.Request, personID int, monday time.Time) ([]projectAllocation, error) {
	rows, err := s.db.Query(r.Context(), allocationsQuery, personID, monday)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := []projectAllocation{}
	byID := map[int]int{} // project id → index in projects
	for rows.Next() {
		var (
			id      int
			name    string
			weekday int
			hours   float64
		)
		if err := rows.Scan(&id, &name, &weekday, &hours); err != nil {
			return nil, err
		}
		i, ok := byID[id]
		if !ok {
			i = len(projects)
			byID[id] = i
			projects = append(projects, projectAllocation{ID: id, Name: name, Days: make([]float64, 5)})
		}
		projects[i].Days[weekday] = hours
	}
	return projects, rows.Err()
}
