package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
)

// maxWeeklyHours is the number of hours in a week; nobody has more capacity.
const maxWeeklyHours = 168

// personID reads the {id} path value of a /api/people/{id}... route.
func personID(r *http.Request) (int, error) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		return 0, errors.New("person id must be a positive integer")
	}
	return id, nil
}

type person struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	WeeklyHours float64 `json:"weeklyHours"`
}

// updatePersonRequest is the PATCH body. Fields are pointers so "absent" and
// "zero" stay distinct; only weeklyHours is editable for now.
type updatePersonRequest struct {
	WeeklyHours *float64 `json:"weeklyHours"`
}

// handleUpdatePerson serves PATCH /api/people/{id} with a JSON body such as
// {"weeklyHours": 32}. It responds with the updated person, which is all the
// grid needs: allocations don't change, and capacity for every week is
// weeklyHours.
func (s *server) handleUpdatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := personID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var req updatePersonRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16))
	dec.DisallowUnknownFields() // a misspelt field would otherwise be a silent no-op
	if err := dec.Decode(&req); err != nil {
		http.Error(w, "invalid body: "+err.Error(), http.StatusBadRequest)
		return
	}
	if req.WeeklyHours == nil {
		http.Error(w, "weeklyHours is required", http.StatusBadRequest)
		return
	}
	if h := *req.WeeklyHours; h < 0 || h > maxWeeklyHours {
		http.Error(w, "weeklyHours must be between 0 and 168", http.StatusBadRequest)
		return
	}

	var p person
	err = s.db.QueryRow(r.Context(),
		`UPDATE people SET weekly_hours = $1 WHERE id = $2 RETURNING id, name, weekly_hours::float8`,
		*req.WeeklyHours, id,
	).Scan(&p.ID, &p.Name, &p.WeeklyHours)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "person not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("update person %d: %v", id, err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, p)
}
