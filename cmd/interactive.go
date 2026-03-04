package cmd

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/go-johnnyhe/shadow/internal/ui"
)

const (
	interactiveActionStart = "start"
	interactiveActionJoin  = "join"
)

func shadowTheme() *huh.Theme {
	t := huh.ThemeCharm()
	cyan := lipgloss.Color("#36CFC9")
	t.Focused.SelectSelector = t.Focused.SelectSelector.Foreground(cyan)
	t.Focused.NextIndicator = t.Focused.NextIndicator.Foreground(cyan)
	t.Focused.PrevIndicator = t.Focused.PrevIndicator.Foreground(cyan)
	t.Focused.MultiSelectSelector = t.Focused.MultiSelectSelector.Foreground(cyan)
	t.Focused.FocusedButton = t.Focused.FocusedButton.Background(cyan)
	t.Focused.Next = t.Focused.FocusedButton
	t.Focused.TextInput.Prompt = t.Focused.TextInput.Prompt.Foreground(cyan)
	return t
}

func runInteractiveWizard() error {
	fmt.Printf("\n  %s\n  %s\n\n", ui.Bold("◗ shadow"), ui.Dim("real-time code sharing — no accounts, no setup"))

	var action string
	err := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("What do you want to do?").
				Options(
					huh.NewOption("Start sharing session", interactiveActionStart),
					huh.NewOption("Join sharing session", interactiveActionJoin),
				).
				Value(&action),
		),
	).WithTheme(shadowTheme()).Run()
	if err != nil {
		return err
	}

	switch action {
	case interactiveActionStart:
		return runInteractiveStart()
	case interactiveActionJoin:
		return runInteractiveJoin()
	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}

func runInteractiveStart() error {
	fmt.Printf("  %s\n\n", ui.Dim("◗ shadow"))

	const (
		shareCurrentDir = "current_dir"
		shareCustomPath = "custom_path"
	)

	shareChoice := shareCurrentDir
	customPath := ""
	path := "."
	readOnlyJoiners := false

	err := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("What should we share?").
				Options(
					huh.NewOption("Entire current folder", shareCurrentDir),
					huh.NewOption("A specific file or subfolder", shareCustomPath),
				).
				Value(&shareChoice),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("File or subfolder path").
				Placeholder("e.g. main.go or ./src").
				Value(&customPath),
		).WithHideFunc(func() bool { return shareChoice != shareCustomPath }),
		huh.NewGroup(
			huh.NewConfirm().
				Title("Read-only mode for joiners?").
				Value(&readOnlyJoiners),
		),
	).WithTheme(shadowTheme()).Run()
	if err != nil {
		return err
	}

	if shareChoice == shareCustomPath {
		path = strings.TrimSpace(customPath)
		if path == "" {
			return fmt.Errorf("path cannot be empty for custom share mode")
		}
	} else {
		path = "."
	}

	return runStart(StartOptions{
		Path:            path,
		Port:            startPort,
		ReadOnlyJoiners: readOnlyJoiners,
	})
}

func runInteractiveJoin() error {
	fmt.Printf("  %s\n\n", ui.Dim("◗ shadow"))

	var sessionURL string

	err := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Paste the shadow join command or URL").
				Value(&sessionURL),
		),
	).WithTheme(shadowTheme()).Run()
	if err != nil {
		return err
	}

	sessionURL = strings.TrimSpace(sessionURL)
	// Handle pasted "shadow join '<url>'" commands
	sessionURL = strings.TrimPrefix(sessionURL, "shadow join ")
	sessionURL = strings.Trim(sessionURL, "'\"")
	sessionURL = strings.TrimSpace(sessionURL)
	if sessionURL == "" {
		return fmt.Errorf("session URL cannot be empty")
	}
	return runJoin(JoinOptions{
		SessionURL: sessionURL,
	})
}
