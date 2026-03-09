package internal

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"time"

	"github.com/google/uuid"
)

type Run struct {
	ID         string `json:"id"`
	TopicID    string `json:"topic_id"`
	Status     string `json:"status"` // running, done, error, cancelled
	PID        int    `json:"pid"`
	Async      bool   `json:"async"`
	StartedAt  int64  `json:"started_at"`
	FinishedAt *int64 `json:"finished_at,omitempty"`
}

// CreateRun registers a new Run in the DB.
func CreateRun(db *sql.DB, topicID string, pid int, async bool) (*Run, error) {
	r := &Run{
		ID:        uuid.NewString()[:8],
		TopicID:   topicID,
		Status:    "running",
		PID:       pid,
		Async:     async,
		StartedAt: time.Now().Unix(),
	}

	asyncInt := 0
	if async {
		asyncInt = 1
	}

	_, err := db.Exec(`INSERT INTO runs (id, topic_id, status, pid, async, started_at) VALUES (?, ?, ?, ?, ?, ?)`,
		r.ID, r.TopicID, r.Status, r.PID, asyncInt, r.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("insert run: %w", err)
	}

	// create output file for async runs
	if async {
		dir := runDir(r.ID)
		os.MkdirAll(dir, 0o755)
		os.WriteFile(filepath.Join(dir, "output"), nil, 0o644)
	}

	return r, nil
}

// GetActiveRun returns the active Run for a topic, or nil.
// Cleans up stale runs where the process has died.
func GetActiveRun(db *sql.DB, topicID string) (*Run, error) {
	r, err := scanRun(db.QueryRow(`SELECT id, topic_id, status, pid, async, started_at, finished_at FROM runs WHERE topic_id = ? AND status = 'running'`, topicID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query active run: %w", err)
	}

	if !IsProcessAlive(r.PID) {
		_ = finishRunDirect(db, r.ID, "error")
		cleanupRunDir(r.ID)
		return nil, nil
	}

	return r, nil
}

// GetRun returns a Run by ID.
func GetRun(db *sql.DB, runID string) (*Run, error) {
	r, err := scanRun(db.QueryRow(`SELECT id, topic_id, status, pid, async, started_at, finished_at FROM runs WHERE id = ?`, runID))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("run %s not found", runID)
	}
	if err != nil {
		return nil, fmt.Errorf("query run: %w", err)
	}
	return r, nil
}

// InjectMessage atomically checks the run is still running and inserts into inbox.
func InjectMessage(db *sql.DB, runID string, message string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var status string
	err = tx.QueryRow(`SELECT status FROM runs WHERE id = ?`, runID).Scan(&status)
	if err != nil {
		return fmt.Errorf("run %s not found", runID)
	}
	if status != "running" {
		return fmt.Errorf("run %s is not active (status: %s)", runID, status)
	}

	_, err = tx.Exec(`INSERT INTO run_inbox (run_id, message) VALUES (?, ?)`, runID, message)
	if err != nil {
		return fmt.Errorf("insert inbox: %w", err)
	}

	return tx.Commit()
}

// DrainInbox reads and deletes all inbox messages for a run.
func DrainInbox(db *sql.DB, runID string) ([]string, error) {
	rows, err := db.Query(`SELECT message FROM run_inbox WHERE run_id = ? ORDER BY id ASC`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []string
	for rows.Next() {
		var msg string
		if err := rows.Scan(&msg); err != nil {
			return nil, err
		}
		msgs = append(msgs, msg)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(msgs) > 0 {
		db.Exec(`DELETE FROM run_inbox WHERE run_id = ?`, runID)
	}
	return msgs, nil
}

// TryFinishRun atomically checks inbox and finishes the run.
// Returns injected messages if any (run continues), or nil (run finished).
func TryFinishRun(db *sql.DB, runID string, status string) ([]string, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// drain inbox within the transaction
	rows, err := tx.Query(`SELECT message FROM run_inbox WHERE run_id = ? ORDER BY id ASC`, runID)
	if err != nil {
		return nil, err
	}
	var msgs []string
	for rows.Next() {
		var msg string
		if err := rows.Scan(&msg); err != nil {
			rows.Close()
			return nil, err
		}
		msgs = append(msgs, msg)
	}
	rows.Close()

	if len(msgs) > 0 {
		// inbox has messages — delete them, keep run alive
		_, err = tx.Exec(`DELETE FROM run_inbox WHERE run_id = ?`, runID)
		if err != nil {
			return nil, err
		}
		return msgs, tx.Commit()
	}

	// inbox empty — finish the run
	now := time.Now().Unix()
	_, err = tx.Exec(`UPDATE runs SET status = ?, finished_at = ? WHERE id = ?`, status, now, runID)
	if err != nil {
		return nil, err
	}
	return nil, tx.Commit()
}

// FinishRun marks a Run as done/error/cancelled (no inbox check).
func FinishRun(db *sql.DB, runID string, status string) error {
	return finishRunDirect(db, runID, status)
}

func finishRunDirect(db *sql.DB, runID string, status string) error {
	now := time.Now().Unix()
	_, err := db.Exec(`UPDATE runs SET status = ?, finished_at = ? WHERE id = ?`, status, now, runID)
	return err
}

// --- Run output directory (async only) ---

func runDir(runID string) string {
	return filepath.Join(clipBase(), "data", "runs", runID)
}

func AppendOutput(runID string, text string) {
	path := filepath.Join(runDir(runID), "output")
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(text)
}

func ReadOutput(runID string) string {
	b, err := os.ReadFile(filepath.Join(runDir(runID), "output"))
	if err != nil {
		return ""
	}
	return string(b)
}

func cleanupRunDir(runID string) {
	os.RemoveAll(runDir(runID))
}

func IsProcessAlive(pid int) bool {
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return p.Signal(syscall.Signal(0)) == nil
}

func scanRun(row *sql.Row) (*Run, error) {
	var r Run
	var asyncInt int
	var finishedAt sql.NullInt64
	err := row.Scan(&r.ID, &r.TopicID, &r.Status, &r.PID, &asyncInt, &r.StartedAt, &finishedAt)
	if err != nil {
		return nil, err
	}
	r.Async = asyncInt == 1
	if finishedAt.Valid {
		r.FinishedAt = &finishedAt.Int64
	}
	return &r, nil
}
