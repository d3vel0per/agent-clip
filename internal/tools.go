package internal

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// RunToolDef returns the function call definition for the "run" tool.
func RunToolDef(commands map[string]string) ToolDef {
	var desc strings.Builder
	desc.WriteString("Execute a command. Available commands:\n")
	for name, help := range commands {
		fmt.Fprintf(&desc, "  %s — %s\n", name, help)
	}

	return ToolDef{
		Type: "function",
		Function: ToolFunctionDef{
			Name:        "run",
			Description: desc.String(),
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"command": {
						"type": "string",
						"description": "Unix-style command to execute"
					},
					"stdin": {
						"type": "string",
						"description": "Standard input for the command"
					}
				},
				"required": ["command"]
			}`),
		},
	}
}

// CommandHandler executes a command and returns output.
type CommandHandler func(args []string, stdin string) (string, error)

// Registry holds available commands.
type Registry struct {
	handlers map[string]CommandHandler
	help     map[string]string
}

func NewRegistry() *Registry {
	r := &Registry{
		handlers: make(map[string]CommandHandler),
		help:     make(map[string]string),
	}
	r.registerBuiltins()
	return r
}

func (r *Registry) Register(name, description string, handler CommandHandler) {
	r.handlers[name] = handler
	r.help[name] = description
}

func (r *Registry) Help() map[string]string {
	return r.help
}

func (r *Registry) Exec(command, stdin string) string {
	parts := strings.Fields(command)
	if len(parts) == 0 {
		return "[error] empty command"
	}

	name := parts[0]
	args := parts[1:]

	handler, ok := r.handlers[name]
	if !ok {
		available := make([]string, 0, len(r.handlers))
		for n := range r.handlers {
			available = append(available, n)
		}
		return fmt.Sprintf("[error] unknown command: %s\nAvailable: %s", name, strings.Join(available, ", "))
	}

	out, err := handler(args, stdin)
	if err != nil {
		return fmt.Sprintf("[error] %s: %v", name, err)
	}
	return out
}

func (r *Registry) registerBuiltins() {
	r.Register("echo", "Echo back the input", func(args []string, stdin string) (string, error) {
		if stdin != "" {
			return stdin, nil
		}
		return strings.Join(args, " "), nil
	})

	r.Register("time", "Return the current time", func(args []string, stdin string) (string, error) {
		return time.Now().Format("2006-01-02 15:04:05 MST"), nil
	})

	r.Register("help", "List available commands", func(args []string, stdin string) (string, error) {
		var b strings.Builder
		for name, desc := range r.help {
			fmt.Fprintf(&b, "  %s — %s\n", name, desc)
		}
		return b.String(), nil
	})
}
