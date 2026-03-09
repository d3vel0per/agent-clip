package main

import (
	"encoding/json"
	"fmt"
	"os"

	"agent-clip/internal"

	"github.com/spf13/cobra"
)

func main() {
	root := &cobra.Command{
		Use:   "agent",
		Short: "Agent Clip CLI",
	}

	root.AddCommand(sendCmd())

	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func sendCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "send",
		Short: "Send a message and stream the response",
		RunE: func(cmd *cobra.Command, args []string) error {
			var input struct {
				Message string `json:"message"`
			}
			if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
				return fmt.Errorf("read stdin: %w", err)
			}
			if input.Message == "" {
				return fmt.Errorf("message is required")
			}

			cfg, err := internal.LoadConfig()
			if err != nil {
				return err
			}

			messages := []internal.Message{
				{Role: "system", Content: cfg.SystemPrompt},
				{Role: "user", Content: input.Message},
			}

			_, err = internal.StreamChat(cfg, messages, func(token string) {
				fmt.Print(token)
			})
			if err != nil {
				return err
			}
			fmt.Println()
			return nil
		},
	}
}
