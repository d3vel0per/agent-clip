package internal

import (
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	EventStatusScheduled = "scheduled"
	EventStatusCanceled  = "canceled"
	EventStatusDone      = "done"

	EventScheduleOnce  = "once"
	EventScheduleDaily = "daily"
)

type Event struct {
	ID            string `json:"id"`
	TopicID       string `json:"topic_id"`
	Prompt        string `json:"prompt"`
	ScheduleKind  string `json:"schedule_kind"`
	ScheduleValue string `json:"schedule_value"`
	Timezone      string `json:"timezone"`
	NextRunAt     int64  `json:"next_run_at"`
	LastRunAt     *int64 `json:"last_run_at,omitempty"`
	Status        string `json:"status"`
	CreatedAt     int64  `json:"created_at"`
	CanceledAt    *int64 `json:"canceled_at,omitempty"`
}

type DueEvent struct {
	Event
	RunMessage string `json:"run_message"`
}

func CreateEvent(db *sql.DB, topicID, prompt, scheduleKind, scheduleValue, timezone string) (*Event, error) {
	if topicID == "" {
		return nil, fmt.Errorf("topic_id is required")
	}
	if prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}
	if timezone == "" {
		timezone = "Local"
	}

	nextRunAt, normalizedValue, err := computeInitialNextRun(scheduleKind, scheduleValue, timezone)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	e := &Event{
		ID:            uuid.NewString()[:8],
		TopicID:       topicID,
		Prompt:        prompt,
		ScheduleKind:  scheduleKind,
		ScheduleValue: normalizedValue,
		Timezone:      timezone,
		NextRunAt:     nextRunAt,
		Status:        EventStatusScheduled,
		CreatedAt:     now,
	}

	_, err = db.Exec(`INSERT INTO events (id, topic_id, prompt, schedule_kind, schedule_value, timezone, next_run_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.TopicID, e.Prompt, e.ScheduleKind, e.ScheduleValue, e.Timezone, e.NextRunAt, e.Status, e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert event: %w", err)
	}
	return e, nil
}

func ListEvents(db *sql.DB, topicID string, includeCanceled bool) ([]Event, error) {
	query := `SELECT id, topic_id, prompt, schedule_kind, schedule_value, timezone, next_run_at, last_run_at, status, created_at, canceled_at FROM events`
	var where []string
	var args []any
	if topicID != "" {
		where = append(where, "topic_id = ?")
		args = append(args, topicID)
	}
	if !includeCanceled {
		where = append(where, "status != ?")
		args = append(args, EventStatusCanceled)
	}
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += " ORDER BY next_run_at ASC, created_at ASC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, *e)
	}
	return events, rows.Err()
}

func UpdateEvent(db *sql.DB, eventID string, updates map[string]string) (*Event, error) {
	var sets []string
	var args []any
	for k, v := range updates {
		switch k {
		case "topic":
			sets = append(sets, "topic_id = ?")
			args = append(args, v)
		case "prompt":
			sets = append(sets, "prompt = ?")
			args = append(args, v)
		case "tz":
			sets = append(sets, "timezone = ?")
			args = append(args, v)
		default:
			return nil, fmt.Errorf("unsupported update field: %s", k)
		}
	}
	if len(sets) == 0 {
		return nil, fmt.Errorf("nothing to update")
	}
	args = append(args, eventID, EventStatusScheduled)
	res, err := db.Exec(`UPDATE events SET `+strings.Join(sets, ", ")+` WHERE id = ? AND status = ?`, args...)
	if err != nil {
		return nil, fmt.Errorf("update event: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return nil, fmt.Errorf("event %s not found or not scheduled", eventID)
	}
	// Return updated event
	row := db.QueryRow(`SELECT id, topic_id, prompt, schedule_kind, schedule_value, timezone, next_run_at, last_run_at, status, created_at, canceled_at FROM events WHERE id = ?`, eventID)
	return scanEvent(row)
}

func CancelEvent(db *sql.DB, eventID string) error {
	now := time.Now().Unix()
	res, err := db.Exec(`UPDATE events SET status = ?, canceled_at = ? WHERE id = ? AND status = ?`, EventStatusCanceled, now, eventID, EventStatusScheduled)
	if err != nil {
		return fmt.Errorf("cancel event: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("event %s not found or not scheduled", eventID)
	}
	return nil
}

func ClaimDueEvents(db *sql.DB, limit int) ([]DueEvent, error) {
	if limit <= 0 {
		limit = 10
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now().Unix()
	rows, err := tx.Query(`SELECT id, topic_id, prompt, schedule_kind, schedule_value, timezone, next_run_at, last_run_at, status, created_at, canceled_at FROM events WHERE status = ? AND next_run_at <= ? ORDER BY next_run_at ASC, created_at ASC LIMIT ?`, EventStatusScheduled, now, limit)
	if err != nil {
		return nil, fmt.Errorf("query due events: %w", err)
	}
	defer rows.Close()

	var due []DueEvent
	for rows.Next() {
		event, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}

		nextRunAt, nextStatus, err := advanceEventSchedule(event, now)
		if err != nil {
			return nil, err
		}

		if _, err := tx.Exec(`UPDATE events SET last_run_at = ?, next_run_at = ?, status = ? WHERE id = ? AND status = ?`, now, nextRunAt, nextStatus, event.ID, EventStatusScheduled); err != nil {
			return nil, fmt.Errorf("update event state: %w", err)
		}

		due = append(due, DueEvent{
			Event:      *event,
			RunMessage: formatEventMessage(event, now),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	sort.Slice(due, func(i, j int) bool { return due[i].NextRunAt < due[j].NextRunAt })
	return due, nil
}

func formatEventMessage(event *Event, firedAt int64) string {
	fired := time.Unix(firedAt, 0).UTC().Format(time.RFC3339)
	return fmt.Sprintf("[scheduled event %s fired at %s] %s", event.ID, fired, event.Prompt)
}

func computeInitialNextRun(kind, value, timezone string) (int64, string, error) {
	loc, err := loadEventLocation(timezone)
	if err != nil {
		return 0, "", err
	}
	now := time.Now().In(loc)

	switch kind {
	case EventScheduleOnce:
		t, err := parseFutureTime(value, loc, now)
		if err != nil {
			return 0, "", err
		}
		return t.Unix(), t.In(time.UTC).Format(time.RFC3339), nil
	case EventScheduleDaily:
		hour, minute, normalized, err := parseDailyTime(value)
		if err != nil {
			return 0, "", err
		}
		next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, loc)
		if !next.After(now) {
			next = next.Add(24 * time.Hour)
		}
		return next.Unix(), normalized, nil
	default:
		return 0, "", fmt.Errorf("unsupported schedule kind: %s", kind)
	}
}

func advanceEventSchedule(event *Event, nowUnix int64) (int64, string, error) {
	switch event.ScheduleKind {
	case EventScheduleOnce:
		return event.NextRunAt, EventStatusDone, nil
	case EventScheduleDaily:
		loc, err := loadEventLocation(event.Timezone)
		if err != nil {
			return 0, "", err
		}
		hour, minute, _, err := parseDailyTime(event.ScheduleValue)
		if err != nil {
			return 0, "", err
		}
		now := time.Unix(nowUnix, 0).In(loc)
		next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, loc)
		for !next.After(now) {
			next = next.Add(24 * time.Hour)
		}
		return next.Unix(), EventStatusScheduled, nil
	default:
		return 0, "", fmt.Errorf("unsupported schedule kind: %s", event.ScheduleKind)
	}
}

func parseFutureTime(value string, loc *time.Location, now time.Time) (time.Time, error) {
	value = strings.TrimSpace(value)
	layouts := []string{time.RFC3339, "2006-01-02 15:04", "2006-01-02 15:04:05", "2006-01-02T15:04"}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, loc); err == nil {
			if !t.After(now) {
				return time.Time{}, fmt.Errorf("scheduled time must be in the future")
			}
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid once schedule, use RFC3339 or YYYY-MM-DD HH:MM")
}

func parseDailyTime(value string) (int, int, string, error) {
	parts := strings.Split(strings.TrimSpace(value), ":")
	if len(parts) != 2 {
		return 0, 0, "", fmt.Errorf("daily schedule must be HH:MM")
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return 0, 0, "", fmt.Errorf("invalid daily hour")
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return 0, 0, "", fmt.Errorf("invalid daily minute")
	}
	return hour, minute, fmt.Sprintf("%02d:%02d", hour, minute), nil
}

func loadEventLocation(name string) (*time.Location, error) {
	if name == "" || strings.EqualFold(name, "local") {
		return time.Local, nil
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		return nil, fmt.Errorf("load timezone: %w", err)
	}
	return loc, nil
}

func scanEvent(scanner interface{ Scan(dest ...any) error }) (*Event, error) {
	var e Event
	var lastRunAt sql.NullInt64
	var canceledAt sql.NullInt64
	if err := scanner.Scan(&e.ID, &e.TopicID, &e.Prompt, &e.ScheduleKind, &e.ScheduleValue, &e.Timezone, &e.NextRunAt, &lastRunAt, &e.Status, &e.CreatedAt, &canceledAt); err != nil {
		return nil, fmt.Errorf("scan event: %w", err)
	}
	if lastRunAt.Valid {
		e.LastRunAt = &lastRunAt.Int64
	}
	if canceledAt.Valid {
		e.CanceledAt = &canceledAt.Int64
	}
	return &e, nil
}

func RegisterEventCommands(r *Registry, db *sql.DB) {
	r.Register("event", `Manage scheduled events.
Subcommands:
  event create once --prompt "..." --at "2026-03-11T18:00:00-07:00" [--topic TOPIC] [--tz America/Los_Angeles]
  event create daily --prompt "..." --time HH:MM [--topic TOPIC] [--tz America/Los_Angeles]
  event list [--topic TOPIC] [--all]
  event update <event-id> [--topic TOPIC] [--prompt "..."] [--tz TIMEZONE]
  event cancel <event-id>`, func(args []string, stdin string) (string, error) {
		if len(args) == 0 {
			return "", fmt.Errorf("usage: event <create|list|update|cancel> ...")
		}
		switch args[0] {
		case "create":
			return eventCreateCommand(db, args[1:])
		case "list":
			return eventListCommand(db, args[1:])
		case "update":
			return eventUpdateCommand(db, args[1:])
		case "cancel":
			return eventCancelCommand(db, args[1:])
		default:
			return "", fmt.Errorf("unknown event subcommand: %s", args[0])
		}
	})
}

func eventCreateCommand(db *sql.DB, args []string) (string, error) {
	if len(args) == 0 {
		return "", fmt.Errorf("usage: event create <once|daily> ...")
	}
	kind := args[0]
	values := make(map[string]string)
	for i := 1; i < len(args); i++ {
		arg := args[i]
		if !strings.HasPrefix(arg, "--") {
			return "", fmt.Errorf("unexpected argument: %s", arg)
		}
		if i+1 >= len(args) {
			return "", fmt.Errorf("missing value for %s", arg)
		}
		values[strings.TrimPrefix(arg, "--")] = args[i+1]
		i++
	}

	topicID := values["topic"]
	if topicID == "" {
		topicID = getCurrentTopic()
	}
	if topicID == "" {
		return "", fmt.Errorf("topic is required")
	}
	prompt := values["prompt"]
	tz := values["tz"]
	scheduleValue := values["at"]
	if kind == EventScheduleDaily {
		scheduleValue = values["time"]
	}

	event, err := CreateEvent(db, topicID, prompt, kind, scheduleValue, tz)
	if err != nil {
		return "", err
	}
	return formatEventLine(event), nil
}

func eventListCommand(db *sql.DB, args []string) (string, error) {
	var topicID string
	includeCanceled := false
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--topic":
			if i+1 >= len(args) {
				return "", fmt.Errorf("missing value for --topic")
			}
			topicID = args[i+1]
			i++
		case "--all":
			includeCanceled = true
		default:
			return "", fmt.Errorf("unexpected argument: %s", args[i])
		}
	}
	if topicID == "" {
		topicID = getCurrentTopic()
	}
	events, err := ListEvents(db, topicID, includeCanceled)
	if err != nil {
		return "", err
	}
	if len(events) == 0 {
		return "no events", nil
	}
	lines := make([]string, 0, len(events))
	for i := range events {
		lines = append(lines, formatEventLine(&events[i]))
	}
	return strings.Join(lines, "\n"), nil
}

func eventUpdateCommand(db *sql.DB, args []string) (string, error) {
	if len(args) < 2 {
		return "", fmt.Errorf("usage: event update <event-id> [--topic TOPIC] [--prompt \"...\"] [--tz TIMEZONE]")
	}
	eventID := args[0]
	updates := make(map[string]string)
	for i := 1; i < len(args); i++ {
		if !strings.HasPrefix(args[i], "--") || i+1 >= len(args) {
			return "", fmt.Errorf("expected --key value pairs after event-id")
		}
		updates[strings.TrimPrefix(args[i], "--")] = args[i+1]
		i++
	}
	event, err := UpdateEvent(db, eventID, updates)
	if err != nil {
		return "", err
	}
	return formatEventLine(event), nil
}

func eventCancelCommand(db *sql.DB, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("usage: event cancel <event-id>")
	}
	if err := CancelEvent(db, args[0]); err != nil {
		return "", err
	}
	return fmt.Sprintf("canceled %s", args[0]), nil
}

func formatEventLine(event *Event) string {
	nextRun := time.Unix(event.NextRunAt, 0).Format(time.RFC3339)
	return fmt.Sprintf("%s [%s] topic=%s next=%s schedule=%s:%s tz=%s prompt=%q", event.ID, event.Status, event.TopicID, nextRun, event.ScheduleKind, event.ScheduleValue, event.Timezone, event.Prompt)
}
