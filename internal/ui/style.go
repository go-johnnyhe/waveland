package ui

import "os"

// UseColor returns true if the terminal supports color output.
func UseColor() bool {
	return os.Getenv("TERM") != "dumb" && os.Getenv("NO_COLOR") == ""
}

func Dim(s string) string {
	if !UseColor() {
		return s
	}
	return "\033[2m" + s + "\033[0m"
}

func Bold(s string) string {
	if !UseColor() {
		return s
	}
	return "\033[1m" + s + "\033[0m"
}

func Accent(s string) string {
	if !UseColor() {
		return s
	}
	return "\033[2;36m" + s + "\033[0m"
}
