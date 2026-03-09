package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
)

const maxIterations = 20

// RunContext controls how the agentic loop interacts with the outside world.
type RunContext struct {
	DB    *sql.DB
	RunID string
	Async bool
}

// RunLoop executes the agentic loop.
// Returns all new messages generated in this run.
func RunLoop(cfg *Config, history []Message, userMessage string, registry *Registry, onToken func(string), rc *RunContext) ([]Message, error) {
	context := []Message{TextMessage("system", cfg.SystemPrompt)}
	context = append(context, history...)

	userMsg := TextMessage("user", userMessage)
	context = append(context, userMsg)
	newMsgs := []Message{userMsg}

	tools := []ToolDef{RunToolDef(registry.Help())}

	for i := 0; i < maxIterations; i++ {
		// check inbox for injected messages
		if rc != nil && rc.DB != nil {
			injected := drainInboxSafe(rc)
			for _, msg := range injected {
				injectMsg := TextMessage("user", msg)
				context = append(context, injectMsg)
				newMsgs = append(newMsgs, injectMsg)
				logInject(rc, msg)
			}
		}

		resp, err := CallLLM(cfg, context, tools, onToken)
		if err != nil {
			return nil, err
		}

		// --- tool_calls → execute and continue loop ---
		if len(resp.ToolCalls) > 0 {
			assistantMsg := Message{
				Role:      "assistant",
				ToolCalls: resp.ToolCalls,
			}
			if resp.Content != "" {
				assistantMsg.Content = &resp.Content
			}
			context = append(context, assistantMsg)
			newMsgs = append(newMsgs, assistantMsg)

			for _, tc := range resp.ToolCalls {
				result := execToolCall(registry, tc)
				logTool(rc, tc, result)
				toolResult := ToolResultMessage(tc.ID, result)
				context = append(context, toolResult)
				newMsgs = append(newMsgs, toolResult)
			}
			continue
		}

		// --- stop → try to finish (atomic inbox check) ---
		assistantText := resp.Content

		if rc != nil && rc.DB != nil {
			// atomic: check inbox + finish
			injected, err := TryFinishRun(rc.DB, rc.RunID, "done")
			if err != nil {
				return nil, fmt.Errorf("finish run: %w", err)
			}
			if len(injected) > 0 {
				// inbox had messages — append assistant response + injected, continue loop
				newMsgs = append(newMsgs, TextMessage("assistant", assistantText))
				context = append(context, TextMessage("assistant", assistantText))

				for _, msg := range injected {
					injectMsg := TextMessage("user", msg)
					context = append(context, injectMsg)
					newMsgs = append(newMsgs, injectMsg)
					logInject(rc, msg)
				}
				continue
			}
			// inbox empty, run marked as done
		}

		newMsgs = append(newMsgs, TextMessage("assistant", assistantText))
		return newMsgs, nil
	}

	return nil, fmt.Errorf("agentic loop exceeded %d iterations", maxIterations)
}

func drainInboxSafe(rc *RunContext) []string {
	msgs, _ := DrainInbox(rc.DB, rc.RunID)
	return msgs
}

func logInject(rc *RunContext, msg string) {
	line := fmt.Sprintf("\n[injected] %s\n", msg)
	fmt.Fprint(os.Stderr, line)
	if rc != nil && rc.Async {
		AppendOutput(rc.RunID, line)
	}
}

func logTool(rc *RunContext, tc ToolCall, result string) {
	line := fmt.Sprintf("[tool] %s(%s) → %s\n", tc.Function.Name, truncate(tc.Function.Arguments, 80), truncate(result, 120))
	fmt.Fprint(os.Stderr, line)
	if rc != nil && rc.Async {
		AppendOutput(rc.RunID, line)
	}
}

func execToolCall(registry *Registry, tc ToolCall) string {
	if tc.Function.Name != "run" {
		return fmt.Sprintf("[error] unknown tool: %s", tc.Function.Name)
	}

	var args struct {
		Command string `json:"command"`
		Stdin   string `json:"stdin"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return fmt.Sprintf("[error] parse arguments: %v", err)
	}

	return registry.Exec(args.Command, args.Stdin)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
