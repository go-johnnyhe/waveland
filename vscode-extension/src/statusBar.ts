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
        this.item.text = "$(broadcast) Shadow: Idle";
        this.item.tooltip = "Start or join a Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.Starting:
        this.item.text = "$(sync~spin) Shadow: Starting\u2026";
        this.item.tooltip = "Setting up the encrypted relay and share flow";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.RunningHost:
        this.item.text = "$(broadcast) Shadow: Sharing";
        this.item.tooltip = session?.joinCommand
          ? "Join command copied and ready to share"
          : "Hosting a Shadow session";
        this.item.backgroundColor = undefined;
        break;
      case SessionState.RunningJoiner:
        this.item.text = "$(broadcast) Shadow: Joined";
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
        this.item.tooltip = session?.lastError ?? "Click for Shadow actions";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
