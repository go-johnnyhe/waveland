import * as path from "path";
import * as vscode from "vscode";
import { SessionState, SessionInfo } from "./types";

/** Simple tree view that shows current session info. */
export class SessionTreeProvider implements vscode.TreeDataProvider<SessionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private state: SessionState = SessionState.Idle;
  private session: SessionInfo | null = null;

  update(state: SessionState, session: SessionInfo | null): void {
    this.state = state;
    this.session = session;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SessionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): SessionItem[] {
    if (this.state === SessionState.Idle && !this.session) {
      return [];
    }

    const items: SessionItem[] = [];

    if (!this.session) return items;

    items.push(new SessionItem("Status", this.stateLabel(), undefined, "info"));
    items.push(new SessionItem(
      "Workspace",
      this.session.workspacePath ? path.basename(this.session.workspacePath) : "Current workspace",
      undefined,
      "folder"
    ));
    items.push(new SessionItem(
      "Mode",
      this.session.mode === "host" ? "Hosting a live session" : "Joined someone else's session",
      undefined,
      this.session.mode === "host" ? "broadcast" : "plug"
    ));

    if (this.session.mode === "host") {
      items.push(new SessionItem(
        "Permissions",
        this.session.hostReadOnly ? "Joiners are read-only" : "Everyone in the session can edit",
        undefined,
        this.session.hostReadOnly ? "lock" : "edit"
      ));
    }

    if (this.session.joinUrl) {
      const item = new SessionItem(
        "Share command",
        this.session.mode === "host" ? "Use the toolbar copy action to send it" : "Session link attached",
        undefined,
        "copy"
      );
      item.tooltip = this.session.joinCommand ?? this.session.joinUrl;
      items.push(item);
    }

    if (this.session.mode === "joiner" && this.session.readOnly) {
      items.push(new SessionItem("Read-only", "Local edits will not sync back to the host", undefined, "lock"));
    }

    if (this.session.fileCount !== undefined) {
      items.push(new SessionItem("Initial snapshot", `${this.session.fileCount} files synced`, undefined, "files"));
    }

    items.push(new SessionItem(
      "Security",
      "End-to-end encryption active. The relay cannot read file contents.",
      undefined,
      "lock"
    ));

    if (this.session.lastError) {
      const errItem = new SessionItem("Last problem", this.session.lastError, undefined, "warning");
      errItem.tooltip = "Use Retry from the view toolbar or command palette.";
      items.push(errItem);
    }

    return items;
  }

  private stateLabel(): string {
    switch (this.state) {
      case SessionState.Starting: return "Starting\u2026";
      case SessionState.RunningHost: return "Sharing";
      case SessionState.RunningJoiner: return "Joined";
      case SessionState.Stopping: return "Stopping\u2026";
      case SessionState.Error: return "Error";
      default: return "Idle";
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}

class SessionItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string | undefined,
    command?: vscode.Command,
    iconId?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    if (command) {
      this.command = command;
    }
    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId);
    }
  }
}
