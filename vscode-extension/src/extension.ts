import { promises as fsp } from "fs";
import * as vscode from "vscode";
import { ShadowProcess } from "./shadowProcess";
import { StatusBar } from "./statusBar";
import { SessionWebviewProvider } from "./sessionWebview";
import { ensureBinary, detectBinary, promptInstall } from "./installer";
import { SessionState } from "./types";

let shadowProcess: ShadowProcess;
let statusBar: StatusBar;
let sessionWebview: SessionWebviewProvider;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("Shadow");
  shadowProcess = new ShadowProcess(outputChannel);
  statusBar = new StatusBar();
  sessionWebview = new SessionWebviewProvider();

  const webviewDisposable = vscode.window.registerWebviewViewProvider(
    SessionWebviewProvider.viewType,
    sessionWebview,
  );

  // Wire state changes to UI.
  shadowProcess.onStateChange(() => {
    refreshSessionUI();
  });

  shadowProcess.onSessionUpdate(() => {
    refreshSessionUI();
  });

  refreshSessionUI();

  // Register commands.
  context.subscriptions.push(
    vscode.commands.registerCommand("shadow.start", cmdStart),
    vscode.commands.registerCommand("shadow.startReadOnly", cmdStartReadOnly),
    vscode.commands.registerCommand("shadow.join", cmdJoin),
    vscode.commands.registerCommand("shadow.stop", cmdStop),
    vscode.commands.registerCommand("shadow.details", cmdDetails),
    vscode.commands.registerCommand("shadow.installCli", cmdInstallCli),
    vscode.commands.registerCommand("shadow.copyJoinUrl", cmdCopyJoinUrl),
    vscode.commands.registerCommand("shadow.retry", cmdRetry),
    vscode.commands.registerCommand("shadow.openOutput", cmdOpenOutput),
    vscode.commands.registerCommand("shadow.quickAction", cmdQuickAction),
    webviewDisposable,
    outputChannel,
    statusBar,
    { dispose: () => shadowProcess.dispose() },
  );
}

export function deactivate(): void {
  shadowProcess?.stop();
}

// -------------------------------------------------------------------
// Commands
// -------------------------------------------------------------------

async function cmdStart(): Promise<void> {
  await cmdStartSession({ readOnlyJoiners: false });
}

async function cmdStartReadOnly(): Promise<void> {
  await cmdStartSession({ readOnlyJoiners: true });
}

async function cmdStartSession(options: { readOnlyJoiners: boolean }): Promise<void> {
  const workspacePath = getWorkspacePath();
  if (!workspacePath) return;

  const binary = await ensureBinary();
  if (!binary) return;

  shadowProcess.start(binary, workspacePath, options);

  // When tunnel_ready fires, offer to copy the join URL.
  // Dispose on terminal events to avoid leaking listeners on failed starts.
  const disposable = shadowProcess.onEvent((evt) => {
    if (evt.event === "tunnel_ready" && evt.join_command) {
      void vscode.env.clipboard.writeText(evt.join_command);
      showInviteMessage(
        options.readOnlyJoiners
          ? "Shadow session started. The join command is already on your clipboard and joiners will be read-only."
          : "Shadow session started. The join command is already on your clipboard and ready to send."
      );
      disposable.dispose();
    } else if (evt.event === "error" || evt.event === "stopped") {
      disposable.dispose();
    }
  });
}

async function cmdJoin(): Promise<void> {
  let workspacePath = getWorkspacePath();
  if (!workspacePath) return;

  const binary = await ensureBinary();
  if (!binary) return;

  const url = await vscode.window.showInputBox({
    prompt: "Paste the Shadow join URL or full 'shadow join ...' command",
    placeHolder: "shadow join 'https://abc123.trycloudflare.com#secret-key'",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const normalized = normalizeJoinInput(value);
      if (!normalized) return "URL is required";
      if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        return "URL must start with http:// or https://";
      }
      if (!normalized.includes("#")) {
        return "URL must include an encryption key fragment (#...)";
      }
      return undefined;
    },
  });

  if (!url) return;

  const cleanUrl = normalizeJoinInput(url);

  // Safety: warn if workspace has existing files that could be overwritten.
  const entries = await fsp.readdir(workspacePath);
  if (entries.length > 0) {
    const choice = await vscode.window.showWarningMessage(
      `This workspace has ${entries.length} existing file(s)/folder(s) (including hidden files). ` +
      `Joining a Shadow session may overwrite files with the same names. ` +
      `Consider joining from an empty folder instead.`,
      { modal: true },
      "Join anyway",
      "Open empty folder"
    );
    if (choice === "Open empty folder") {
      const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select empty folder for Shadow",
      });
      if (!picked || picked.length === 0) return;
      workspacePath = picked[0].fsPath;
    } else if (choice !== "Join anyway") {
      return; // Dismissed
    }
  }

  shadowProcess.join(binary, cleanUrl, workspacePath);
}

function cmdStop(): void {
  if (shadowProcess.state === SessionState.Idle) {
    vscode.window.showInformationMessage("No active Shadow session.");
    return;
  }
  shadowProcess.stop();
}

function cmdDetails(): void {
  const session = shadowProcess.session;
  if (!session) {
    vscode.window.showInformationMessage("No active Shadow session. Use 'Shadow: Start Session' or 'Shadow: Join Session'.");
    return;
  }

  const lines: string[] = [
    `Mode: ${session.mode}`,
    `State: ${shadowProcess.state}`,
  ];
  if (session.workspacePath) lines.push(`Workspace: ${session.workspacePath}`);
  if (session.mode === "host") {
    lines.push(`Permissions: ${session.hostReadOnly ? "joiners read-only" : "everyone can edit"}`);
  }
  if (session.joinUrl) lines.push(`Join URL: ${session.joinUrl}`);
  if (session.joinCommand) lines.push(`Join command: ${session.joinCommand}`);
  if (session.fileCount !== undefined) lines.push(`Files: ${session.fileCount}`);
  if (session.mode === "joiner" && session.readOnly) lines.push("Read-only: yes");
  if (session.lastError) lines.push(`Last error: ${session.lastError}`);
  lines.push("", "End-to-end encryption active. Relay cannot read file contents.");

  outputChannel.appendLine("--- Session Details ---");
  for (const line of lines) outputChannel.appendLine(line);
  outputChannel.show();
}

async function cmdInstallCli(): Promise<void> {
  const result = await detectBinary();
  if (result.found) {
    vscode.window.showInformationMessage(`Shadow CLI already installed (${result.version}) at ${result.path}`);
    return;
  }
  await promptInstall();
}

function cmdCopyJoinUrl(): void {
  const session = shadowProcess.session;
  const url = session?.joinCommand ?? session?.joinUrl;
  if (url) {
    void vscode.env.clipboard.writeText(url);
    if (session?.mode === "host") {
      showInviteMessage(
        session.hostReadOnly
          ? "Invitation copied again. Joiners will be read-only."
          : "Invitation copied to clipboard. Send it to someone you trust."
      );
      return;
    }
    const noun = session?.joinCommand ? "Join command" : "Join URL";
    vscode.window.showInformationMessage(`${noun} copied. Send it to your teammate.`);
  }
}

async function cmdRetry(): Promise<void> {
  const session = shadowProcess.session;
  if (!session) {
    vscode.window.showInformationMessage("No failed Shadow session to retry.");
    return;
  }

  const binary = await ensureBinary();
  if (!binary) return;

  const workspacePath = session.workspacePath ?? getWorkspacePath();
  if (!workspacePath) return;

  if (session.mode === "host") {
    shadowProcess.start(binary, workspacePath, { readOnlyJoiners: Boolean(session.hostReadOnly) });
    return;
  }

  if (!session.joinUrl) {
    vscode.window.showWarningMessage("Retry needs the previous join URL. Starting join flow again.");
    await cmdJoin();
    return;
  }

  shadowProcess.join(binary, session.joinUrl, workspacePath);
}

function cmdOpenOutput(): void {
  outputChannel.show(true);
}

async function cmdQuickAction(): Promise<void> {
  type ActionItem = vscode.QuickPickItem & { id: string };
  const items: ActionItem[] = [];

  if (shadowProcess.state === SessionState.Idle || shadowProcess.state === SessionState.Error) {
    if (shadowProcess.state === SessionState.Error) {
      items.push({
        id: "retry",
        label: "$(refresh) Retry Last Action",
        description: "Retry the previous failed Shadow action",
      });
    }
    items.push(
      { id: "start", label: "$(broadcast) Start Session", description: "Share this workspace live" },
      {
        id: "startReadOnly",
        label: "$(lock) Start Read-Only Session",
        description: "Invite others without syncing their edits back",
      },
      { id: "join", label: "$(plug) Join Session", description: "Paste a Shadow URL or full join command" }
    );
  } else {
    if (shadowProcess.session?.joinCommand || shadowProcess.session?.joinUrl) {
      items.push({
        id: "copyJoin",
        label: "$(person-add) Invite Others (Copy Link)",
        description: "Copy the full Shadow join command to your clipboard",
      });
    }
    items.push(
      { id: "details", label: "$(info) Session Details", description: "Show the current Shadow session summary" },
      {
        id: "stop",
        label: shadowProcess.state === SessionState.RunningJoiner
          ? "$(debug-stop) Leave Collaboration Session"
          : "$(debug-stop) Stop Collaboration Session",
        description: shadowProcess.state === SessionState.RunningJoiner
          ? "Leave this Shadow session"
          : "Stop the current Shadow session",
      }
    );
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: "Shadow",
    placeHolder:
      shadowProcess.state === SessionState.RunningHost
        ? "What would you like to do with this collaboration session?"
        : shadowProcess.state === SessionState.RunningJoiner
          ? "What would you like to do in this collaboration session?"
          : "What would you like to do with Shadow?",
  });
  if (!picked) return;

  switch (picked.id) {
    case "start":
      await cmdStart();
      break;
    case "startReadOnly":
      await cmdStartReadOnly();
      break;
    case "join":
      await cmdJoin();
      break;
    case "retry":
      await cmdRetry();
      break;
    case "details":
      cmdDetails();
      break;
    case "copyJoin":
      cmdCopyJoinUrl();
      break;
    case "stop":
      cmdStop();
      break;
  }
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getWorkspacePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("Open a workspace folder before starting a Shadow session.");
    return undefined;
  }
  return folders[0].uri.fsPath;
}

function normalizeJoinInput(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^shadow\s+join\s+/i, "");
  normalized = normalized.trim();
  normalized = normalized.replace(/^['"]|['"]$/g, "");
  return normalized.trim();
}

function refreshSessionUI(): void {
  const session = shadowProcess.session;
  const state = shadowProcess.state;

  statusBar.update(state, session);
  sessionWebview.update(state, session);

  void vscode.commands.executeCommand("setContext", "shadow.hasSession", Boolean(session));
  void vscode.commands.executeCommand(
    "setContext",
    "shadow.hasActiveSession",
    state !== SessionState.Idle && state !== SessionState.Error
  );
  void vscode.commands.executeCommand("setContext", "shadow.hasError", state === SessionState.Error);
  void vscode.commands.executeCommand(
    "setContext",
    "shadow.canCopyJoin",
    Boolean(session?.joinCommand || session?.joinUrl)
  );
  void vscode.commands.executeCommand("setContext", "shadow.isHostSession", session?.mode === "host");
}

function showInviteMessage(message: string): void {
  void vscode.window.showInformationMessage(
    message,
    "Copy again",
    "Session details",
    "Stop session"
  ).then((choice) => {
    if (choice === "Copy again") {
      const session = shadowProcess.session;
      const text = session?.joinCommand ?? session?.joinUrl;
      if (text) {
        void vscode.env.clipboard.writeText(text);
      }
    } else if (choice === "Session details") {
      cmdDetails();
    } else if (choice === "Stop session") {
      cmdStop();
    }
  });
}
