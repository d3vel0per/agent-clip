package internal

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

// InvokeClip calls a clip's command via `pinix invoke`, passing args directly.
func InvokeClip(clip *ClipConfig, command string, cmdArgs []string, stdin string) (string, error) {
	// pinix invoke <command> --server <url> --token <token> -- [args...]
	args := []string{"invoke", command,
		"--server", clip.URL,
		"--token", clip.Token,
	}
	if len(cmdArgs) > 0 {
		args = append(args, "--")
		args = append(args, cmdArgs...)
	}

	cmd := exec.Command("pinix", args...)
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	output := stdout.String()
	if output == "" && err != nil {
		// filter boxlite logs from stderr, surface real errors
		for _, line := range strings.Split(stderr.String(), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.Contains(line, "boxlite") ||
				strings.Contains(line, "INFO") || strings.Contains(line, "WARN") {
				continue
			}
			output += line + "\n"
		}
		if output == "" {
			return "", fmt.Errorf("clip %s %s failed: %v", clip.Name, command, err)
		}
	}

	return strings.TrimRight(output, "\n"), nil
}

// RegisterClipCommands adds the "clip" command to the registry.
func RegisterClipCommands(r *Registry, cfg *Config) {
	var desc strings.Builder
	desc.WriteString("Invoke external clips (sandboxed environments, services).\n")
	desc.WriteString("Usage:\n")
	desc.WriteString("  clip list                              — list available clips\n")
	desc.WriteString("  clip <name> <command> [args...]         — invoke (args passed directly)\n")

	if len(cfg.Clips) > 0 {
		desc.WriteString("\nAvailable clips:\n")
		for _, c := range cfg.Clips {
			if len(c.Commands) > 0 {
				for _, cmd := range c.Commands {
					fmt.Fprintf(&desc, "  clip %s %s\n", c.Name, cmd)
				}
			} else {
				fmt.Fprintf(&desc, "  clip %s <command>\n", c.Name)
			}
		}
		desc.WriteString("\nExamples:\n")
		desc.WriteString("  clip sandbox bash ls -la\n")
		desc.WriteString("  clip sandbox bash \"echo hello && pwd\"\n")
		desc.WriteString("  clip sandbox read /tmp/file.txt\n")
		desc.WriteString("  clip sandbox write /tmp/file.txt        (stdin = file content)\n")
		desc.WriteString("  clip sandbox edit /tmp/f.txt old new\n")
	}

	r.Register("clip", desc.String(), func(args []string, stdin string) (string, error) {
		if len(args) == 0 || (len(args) == 1 && args[0] == "list") {
			return clipList(cfg), nil
		}

		clipName := args[0]
		clip := cfg.GetClip(clipName)
		if clip == nil {
			return "", fmt.Errorf("clip %q not found. Use 'clip list' to see available clips", clipName)
		}

		if len(args) == 1 {
			return clipInfo(clip), nil
		}

		command := args[1]
		cmdArgs := args[2:] // remaining args passed directly to the clip command
		return InvokeClip(clip, command, cmdArgs, stdin)
	})
}

func clipList(cfg *Config) string {
	if len(cfg.Clips) == 0 {
		return "No clips configured."
	}
	var b strings.Builder
	for _, c := range cfg.Clips {
		fmt.Fprintf(&b, "  %s", c.Name)
		if len(c.Commands) > 0 {
			fmt.Fprintf(&b, " — commands: %s", strings.Join(c.Commands, ", "))
		}
		fmt.Fprintln(&b)
	}
	return b.String()
}

func clipInfo(clip *ClipConfig) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Clip: %s\n", clip.Name)
	fmt.Fprintf(&b, "URL:  %s\n", clip.URL)
	if len(clip.Commands) > 0 {
		fmt.Fprintf(&b, "Commands:\n")
		for _, cmd := range clip.Commands {
			fmt.Fprintf(&b, "  %s\n", cmd)
		}
	}
	return b.String()
}
