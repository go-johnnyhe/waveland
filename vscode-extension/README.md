# Shadow for VS Code

Encrypted real-time coding for teams that do not want editor lock-in.

Shadow lets you start or join a live coding session from VS Code while keeping the same underlying workflow as the Shadow CLI. Hosts can start a session, get the full join command copied automatically, and send that handoff to a teammate using the CLI or the extension.

## What it does

- Starts a Shadow session from your current workspace
- Starts a read-only host session when you want teammates to view without syncing edits back
- Joins an existing session from a full `shadow join 'https://...#key'` command or a raw URL
- Copies the teammate join command for you when a host session is ready
- Uses the Shadow status bar item as the main start/join/invite flow
- Shows session status and details in the Activity Bar
- Prompts to install or upgrade the Shadow CLI when needed

## How to use it

1. Install the extension.
2. Open a project folder in VS Code.
3. Click the `Shadow` item in the bottom status bar.
4. Choose one of these:
   - `Start Session` to host a normal collaborative session
   - `Start Read-Only Session` to host without accepting teammate edits
   - `Join Session` to paste a Shadow URL or full `shadow join '...'` command
5. If you start a session, Shadow copies the full join command for you automatically.
6. Send that command to your teammate. They can join from the CLI or the VS Code extension.

## Quick reference

- `Invite Others (Copy Link)` copies the full join command again
- `Session Details` shows the current session summary
- `Stop Collaboration Session` ends a hosted session
- `Leave Collaboration Session` leaves a joined session

## Quick start

1. Install the extension
2. Open a project folder in VS Code
3. Click the `Shadow` status bar item or run `Shadow: Start Session`
4. Send the copied join command to your teammate
5. They join from VS Code or the CLI and edit live

## Requirements

The extension uses the Shadow CLI for the actual encrypted sync session. If the CLI is missing, the extension offers to install it for you on macOS and Linux.

## Links

- CLI and docs: https://github.com/go-johnnyhe/shadow
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=go-johnnyhe77.shadow-vscode
