package main

import (
	"fmt"

	"agent-clip/internal"

	"github.com/spf13/cobra"
)

func eventCheckCmd() *cobra.Command {
	var limit int

	cmd := &cobra.Command{
		Use:   "event-check",
		Short: "Scan for due events and trigger async sends",
		RunE: func(cmd *cobra.Command, args []string) error {
			out := getOutput()
			db, err := internal.OpenDB()
			if err != nil {
				return err
			}
			defer db.Close()

			due, err := internal.ClaimDueEvents(db, limit)
			if err != nil {
				return err
			}
			if len(due) == 0 {
				out.Info("no due events")
				return nil
			}

			activeTopics := internal.GetActiveRunTopics(db)
			triggered := 0
			skipped := 0
			for _, event := range due {
				if activeTopics[event.TopicID] {
					skipped++
					out.Info(fmt.Sprintf("skipped %s: topic %s already running", event.ID, event.TopicID))
					continue
				}
				if err := spawnDetachedAgent("send", "--topic", event.TopicID, "--payload", event.RunMessage, "--async"); err != nil {
					return fmt.Errorf("trigger event %s: %w", event.ID, err)
				}
				activeTopics[event.TopicID] = true
				triggered++
				out.Info(fmt.Sprintf("triggered %s for topic %s", event.ID, event.TopicID))
			}
			out.Result(map[string]int{"due": len(due), "triggered": triggered, "skipped": skipped})
			return nil
		},
	}

	cmd.Flags().IntVar(&limit, "limit", 10, "Max due events to process")
	return cmd
}
