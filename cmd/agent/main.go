package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"time"

	"agent-clip/internal"

	"github.com/spf13/cobra"
)

func main() {
	root := &cobra.Command{
		Use:   "agent",
		Short: "Agent Clip CLI",
	}

	root.AddCommand(sendCmd())
	root.AddCommand(createTopicCmd())
	root.AddCommand(listTopicsCmd())
	root.AddCommand(getRunCmd())
	root.AddCommand(cancelRunCmd())
	root.AddCommand(workerCmd())

	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func sendCmd() *cobra.Command {
	var payload string
	var topicID string
	var runID string
	var async bool

	cmd := &cobra.Command{
		Use:   "send",
		Short: "Send a message and run the agentic loop",
		Example: `  send -p "hello"                       # new topic, sync
  send -p "hello" -t abc123             # continue topic, sync
  send -p "hello" --async               # new topic, background
  send -p "hello" -t abc123 --async     # continue topic, background
  send -p "more info" -r a1b2c3         # inject into active run`,
		RunE: func(cmd *cobra.Command, args []string) error {
			message := payload
			if message == "" {
				var input struct {
					Message string `json:"message"`
					TopicID string `json:"topic_id"`
					RunID   string `json:"run_id"`
				}
				if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
					return fmt.Errorf("read stdin: %w", err)
				}
				message = input.Message
				if topicID == "" {
					topicID = input.TopicID
				}
				if runID == "" {
					runID = input.RunID
				}
			}
			if message == "" {
				return fmt.Errorf("message is required (-p or stdin JSON)")
			}

			// --- inject mode ---
			if runID != "" {
				db, err := internal.OpenDB()
				if err != nil {
					return err
				}
				defer db.Close()

				if err := internal.InjectMessage(db, runID, message); err != nil {
					return err
				}
				fmt.Fprintf(os.Stderr, "[inject] sent to run %s\n", runID)
				return nil
			}

			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			// auto-create topic
			if topicID == "" {
				name := message
				if len([]rune(name)) > 30 {
					name = string([]rune(name)[:30]) + "..."
				}
				topic, err := internal.CreateTopic(db, name)
				if err != nil {
					return err
				}
				topicID = topic.ID
				fmt.Fprintf(os.Stderr, "[topic] %s (%s)\n", topicID, topic.Name)
			}

			// defense: check for active Run
			activeRun, err := internal.GetActiveRun(db, topicID)
			if err != nil {
				return err
			}
			if activeRun != nil {
				elapsed := time.Since(time.Unix(activeRun.StartedAt, 0)).Truncate(time.Second)
				return fmt.Errorf("topic %s has an active run (%s, running %s)\n  → inject:  send -p '...' -r %s\n  → watch:   get-run %s\n  → cancel:  cancel-run %s",
					topicID, activeRun.ID, elapsed, activeRun.ID, activeRun.ID, activeRun.ID)
			}

			if async {
				return startAsync(db, topicID, message)
			}
			return runSync(db, topicID, message)
		},
	}

	cmd.Flags().StringVarP(&payload, "payload", "p", "", "Message to send")
	cmd.Flags().StringVarP(&topicID, "topic", "t", "", "Topic ID")
	cmd.Flags().StringVarP(&runID, "run", "r", "", "Inject into active run")
	cmd.Flags().BoolVar(&async, "async", false, "Run in background")

	return cmd
}

func runSync(db *sql.DB, topicID, message string) error {
	cfg, err := internal.LoadConfig()
	if err != nil {
		return err
	}

	history, err := internal.LoadMessages(db, topicID)
	if err != nil {
		return err
	}

	run, err := internal.CreateRun(db, topicID, os.Getpid(), false)
	if err != nil {
		return err
	}

	registry := internal.NewRegistry()
	rc := &internal.RunContext{DB: db, RunID: run.ID, Async: false}

	newMsgs, err := internal.RunLoop(cfg, history, message, registry, func(token string) {
		fmt.Print(token)
	}, rc)

	if err != nil {
		_ = internal.FinishRun(db, run.ID, "error")
		return err
	}
	fmt.Println()

	if err := internal.SaveMessages(db, topicID, newMsgs); err != nil {
		_ = internal.FinishRun(db, run.ID, "error")
		return err
	}

	// TryFinishRun already called by the loop on stop; just save messages
	return nil
}

func startAsync(db *sql.DB, topicID, message string) error {
	run, err := internal.CreateRun(db, topicID, 0, true)
	if err != nil {
		return err
	}

	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	cmd := exec.Command(exe, "_run-worker",
		"--run-id", run.ID,
		"--topic-id", topicID,
		"--message", message)
	cmd.Stdout = nil
	cmd.Stderr = nil
	cmd.Stdin = nil
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}

	if err := cmd.Start(); err != nil {
		_ = internal.FinishRun(db, run.ID, "error")
		return fmt.Errorf("start worker: %w", err)
	}

	db.Exec("UPDATE runs SET pid = ? WHERE id = ?", cmd.Process.Pid, run.ID)

	fmt.Fprintf(os.Stderr, "[run] %s started (async, pid %d)\n", run.ID, cmd.Process.Pid)
	fmt.Fprintf(os.Stderr, "  → watch:   get-run %s\n", run.ID)
	fmt.Fprintf(os.Stderr, "  → inject:  send -p '...' -r %s\n", run.ID)
	fmt.Fprintf(os.Stderr, "  → cancel:  cancel-run %s\n", run.ID)

	return nil
}

func workerCmd() *cobra.Command {
	var runID, topicID, message string

	cmd := &cobra.Command{
		Use:    "_run-worker",
		Hidden: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := internal.LoadConfig()
			if err != nil {
				return err
			}

			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			db.Exec("UPDATE runs SET pid = ? WHERE id = ?", os.Getpid(), runID)

			history, err := internal.LoadMessages(db, topicID)
			if err != nil {
				_ = internal.FinishRun(db, runID, "error")
				return err
			}

			registry := internal.NewRegistry()
			rc := &internal.RunContext{DB: db, RunID: runID, Async: true}

			newMsgs, err := internal.RunLoop(cfg, history, message, registry, func(token string) {
				internal.AppendOutput(runID, token)
			}, rc)

			if err != nil {
				internal.AppendOutput(runID, fmt.Sprintf("\n[error] %v\n", err))
				_ = internal.FinishRun(db, runID, "error")
				return err
			}

			internal.AppendOutput(runID, "\n")

			if err := internal.SaveMessages(db, topicID, newMsgs); err != nil {
				_ = internal.FinishRun(db, runID, "error")
				return err
			}

			// Run already marked done by TryFinishRun in the loop
			return nil
		},
	}

	cmd.Flags().StringVar(&runID, "run-id", "", "")
	cmd.Flags().StringVar(&topicID, "topic-id", "", "")
	cmd.Flags().StringVar(&message, "message", "", "")
	cmd.MarkFlagsRequiredTogether("run-id", "topic-id", "message")

	return cmd
}

func getRunCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get-run [run-id]",
		Short: "Show run status and output",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			run, err := internal.GetRun(db, args[0])
			if err != nil {
				return err
			}

			if run.Status == "running" && !internal.IsProcessAlive(run.PID) {
				_ = internal.FinishRun(db, run.ID, "error")
				run.Status = "error"
			}

			fmt.Fprintf(os.Stderr, "[run] %s  topic=%s  status=%s  started=%s\n",
				run.ID, run.TopicID, run.Status,
				time.Unix(run.StartedAt, 0).Format("15:04:05"))

			if run.Async {
				output := internal.ReadOutput(run.ID)
				if output != "" {
					fmt.Print(output)
				}
			}

			return nil
		},
	}
}

func cancelRunCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "cancel-run [run-id]",
		Short: "Cancel an active run",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			run, err := internal.GetRun(db, args[0])
			if err != nil {
				return err
			}

			if run.Status != "running" {
				return fmt.Errorf("run %s is not active (status: %s)", run.ID, run.Status)
			}

			if internal.IsProcessAlive(run.PID) {
				p, _ := os.FindProcess(run.PID)
				_ = p.Signal(syscall.SIGTERM)
			}

			_ = internal.FinishRun(db, run.ID, "cancelled")
			fmt.Fprintf(os.Stderr, "[run] %s cancelled\n", run.ID)
			return nil
		},
	}
}

func createTopicCmd() *cobra.Command {
	var name string

	cmd := &cobra.Command{
		Use:     "create-topic",
		Short:   "Create a new conversation topic",
		Example: `  create-topic -n "聊代码"`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if name == "" {
				var input struct {
					Name string `json:"name"`
				}
				if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
					return fmt.Errorf("read stdin: %w", err)
				}
				name = input.Name
			}
			if name == "" {
				return fmt.Errorf("name is required (-n or stdin JSON)")
			}

			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			topic, err := internal.CreateTopic(db, name)
			if err != nil {
				return err
			}

			return json.NewEncoder(os.Stdout).Encode(topic)
		},
	}

	cmd.Flags().StringVarP(&name, "name", "n", "", "Topic name")
	return cmd
}

func listTopicsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list-topics",
		Short: "List all conversation topics",
		RunE: func(cmd *cobra.Command, args []string) error {
			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			topics, err := internal.ListTopics(db)
			if err != nil {
				return err
			}

			return json.NewEncoder(os.Stdout).Encode(topics)
		},
	}
}
