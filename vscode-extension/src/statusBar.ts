import * as vscode from "vscode";
import { SessionState } from "./types";
import { SessionInfo } from "./types";

export class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "shadow.quickAction";
    this.update(SessionState.Idle, null);
    this.item.show();
  }

  update(state: SessionState, session: SessionInfo | null): void {
    switch (state) {
      case SessionState.Idle:
        this.item.text = "◗ Shadow";
        this.item.tooltip = "Start or join a Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.Starting:
        this.item.text = "$(sync~spin) Shadow: Starting\u2026";
        this.item.tooltip = "Creating your Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.RunningHost:
        this.item.text = "◗ Shadow: Shared";
        this.item.tooltip = session?.joinCommand
          ? session.hostReadOnly
            ? "Join command copied. Joiners will be read-only."
            : "Join command copied and ready to share"
          : "Hosting a Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.RunningJoiner:
        this.item.text = "◗ Shadow: Joined";
        this.item.tooltip = "Connected to a Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.Stopping:
        this.item.text = "$(sync~spin) Shadow: Stopping\u2026";
        this.item.tooltip = "Shutting down\u2026";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.Error:
        this.item.text = "$(error) Shadow: Error";
        this.item.tooltip = session?.lastError ?? "Open the Shadow menu to retry or start again";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
