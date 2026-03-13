/*
Copyright © 2025 tianshengqingxiang@gmail.com
*/
package cmd

import (
	"fmt"

	"github.com/go-johnnyhe/shadow/internal/ui"
	"github.com/spf13/cobra"
)

var joinKey string
var joinJSON bool
var joinPathFlag string

var joinCmd = &cobra.Command{
	Use:   "join <session-url>",
	Short: "Join an existing collaborative coding session",
	Long: `Join a collaborative coding session by connecting to the provided URL.

This will:
- Connect to the session via WebSocket
- Enable real-time file synchronization

Example:
  shadow join 'https://abc123.trycloudflare.com#<e2e-key>'

The session URL comes from whoever ran 'shadow start'.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if joinJSON {
			cmd.SilenceErrors = true
			cmd.SilenceUsage = true
		}

		if len(args) != 1 {
			err := fmt.Errorf("expected exactly one session URL")
			if joinJSON {
				emitJSONError(err.Error())
				return err
			}
			fmt.Printf("Error: %v\n", err)
			cmd.Usage()
			return nil
		}

		if !joinJSON {
			fmt.Printf("\n  %s\n", ui.Dim("◗ shadow"))
		}

		err := runJoin(JoinOptions{
			SessionURL: args[0],
			E2EKey:     joinKey,
			Path:       joinPathFlag,
			JSONMode:   joinJSON,
		})
		if err != nil {
			if joinJSON {
				emitJSONError(err.Error())
				return err
			}
			fmt.Printf("Error: %v\n", err)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(joinCmd)
	joinCmd.Flags().StringVar(&joinKey, "key", "", "E2E share key (optional if included in URL fragment)")
	joinCmd.Flags().StringVar(&joinPathFlag, "path", "", "Directory to sync into (alternative to current directory)")
	joinCmd.Flags().BoolVar(&joinJSON, "json", false, "Emit structured JSON events to stdout")
}
