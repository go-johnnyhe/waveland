# Shadow for VS Code

Encrypted real-time coding for teams that do not want editor lock-in.

Shadow lets you start or join a live coding session from VS Code while keeping the same underlying workflow as the Shadow CLI. Hosts can start a session, get the full join command copied automatically, and send that handoff to a teammate using the CLI or the extension.

## What it does

- Starts a Shadow session from your current workspace
- Joins an existing session from a full `shadow join 'https://...#key'` command or a raw URL
- Copies the teammate join command for you when a host session is ready
- Shows session status, errors, and logs in the Activity Bar
- Prompts to install or upgrade the Shadow CLI when needed

## Quick start

1. Install the extension
2. Open a project folder in VS Code
3. Run `Shadow: Start Session` from the command palette or the Shadow view
4. Send the copied join command to your teammate
5. They join from VS Code or the CLI and edit live

## Requirements

The extension uses the Shadow CLI for the actual encrypted sync session. If the CLI is missing, the extension offers to install it for you on macOS and Linux.

## Links

- CLI and docs: https://github.com/go-johnnyhe/shadow
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=go-johnnyhe77.shadow-vscode
