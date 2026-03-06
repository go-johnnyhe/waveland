import * as path from "path";
import * as vscode from "vscode";
import { SessionState, SessionInfo } from "./types";

export class SessionWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "shadow.session";

  private _view?: vscode.WebviewView;
  private _state: SessionState = SessionState.Idle;
  private _session: SessionInfo | null = null;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command) {
        vscode.commands.executeCommand(`shadow.${message.command}`);
      }
    });

    this._render();
  }

  update(state: SessionState, session: SessionInfo | null): void {
    this._state = state;
    this._session = session;
    this._render();
  }

  private _render(): void {
    if (!this._view) return;
    this._view.webview.html = this._html();
  }

  private _html(): string {
    let body: string;

    if (this._state === SessionState.Starting || this._state === SessionState.Stopping) {
      body = this._transitionBody();
    } else if (this._state === SessionState.RunningHost || this._state === SessionState.RunningJoiner) {
      body = this._activeBody();
    } else if (this._state === SessionState.Error) {
      body = this._errorBody();
    } else {
      body = this._idleBody();
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${CSS}</style>
</head>
<body>
${body}
<script>
const vscode = acquireVsCodeApi();
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cmd]');
  if (t) vscode.postMessage({ command: t.dataset.cmd });
});
</script>
</body>
</html>`;
  }

  // ── Idle ──────────────────────────────────────────────

  private _idleBody(): string {
    return `
<div class="hero">
  <span class="hero-icon">
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#1c1b18"/>
      <path d="M16 6 A10 10 0 0 1 16 26 L16 6Z" fill="#faf9f6"/>
    </svg>
  </span>
  <p class="hero-title">Shadow</p>
  <p class="hero-sub">Encrypted real-time collaboration.</p>
</div>

<div class="stack">
  <button class="btn primary" data-cmd="start">Start Session</button>
  <button class="btn primary" data-cmd="join">Join Session</button>
  <button class="btn secondary" data-cmd="startReadOnly">Start Read-Only Session</button>
</div>

<div class="sep"></div>

<div class="row">
  <button class="link" data-cmd="installCli">Install CLI</button>
  <span class="dot-sep"></span>
  <button class="link" data-cmd="openOutput">View Logs</button>
</div>

<p class="footnote">End-to-end encrypted. The relay never sees your code.</p>`;
  }

  // ── Starting / Stopping ──────────────────────────────

  private _transitionBody(): string {
    const starting = this._state === SessionState.Starting;
    return `
<div class="status-card">
  <div class="status-dot pulse"></div>
  <span class="status-text">${starting ? "Starting session\u2026" : "Stopping session\u2026"}</span>
</div>
<p class="hint">${starting ? "Setting up your encrypted tunnel. This usually takes a few seconds." : "Cleaning up\u2026"}</p>`;
  }

  // ── Active session ───────────────────────────────────

  private _activeBody(): string {
    const s = this._session;
    const host = s?.mode === "host";

    let rows = "";
    if (s?.workspacePath) {
      rows += infoRow("Workspace", path.basename(s.workspacePath));
    }
    rows += infoRow("Role", host ? "Host" : "Joiner");
    if (host) {
      rows += infoRow("Permissions", s?.hostReadOnly ? "Joiners read-only" : "Everyone can edit");
    }
    if (!host && s?.readOnly) {
      rows += infoRow("Access", "Read-only");
    }
    if (s?.fileCount !== undefined) {
      rows += infoRow("Files synced", String(s.fileCount));
    }
    rows += infoRow("Security", "E2E encrypted");

    const hasInvite = !!(s?.joinCommand || s?.joinUrl);

    return `
<div class="status-card">
  <div class="status-dot active"></div>
  <span class="status-text">${host ? "Sharing" : "Joined"}</span>
</div>

<div class="info-table">${rows}</div>

${hasInvite ? '<button class="btn primary full" data-cmd="copyJoinUrl">Copy Invite Link</button>' : ""}
<button class="btn outline-danger full" data-cmd="stop">${host ? "Stop Session" : "Leave Session"}</button>

<div class="row mt">
  <button class="link" data-cmd="details">Details</button>
  <span class="dot-sep"></span>
  <button class="link" data-cmd="openOutput">Logs</button>
</div>`;
  }

  // ── Error ────────────────────────────────────────────

  private _errorBody(): string {
    const msg = this._session?.lastError || "Something went wrong.";
    return `
<div class="status-card">
  <div class="status-dot err"></div>
  <span class="status-text">Error</span>
</div>

<div class="error-box">${esc(msg)}</div>

<div class="stack">
  <button class="btn primary" data-cmd="retry">Retry</button>
  <button class="btn secondary" data-cmd="start">New Session</button>
  <button class="btn secondary" data-cmd="join">Join Instead</button>
</div>

<div class="sep"></div>
<div class="row">
  <button class="link" data-cmd="openOutput">View Logs</button>
</div>`;
  }

  dispose(): void {}
}

// ── Helpers ──────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function infoRow(key: string, val: string): string {
  return `<div class="info-row"><span class="info-key">${esc(key)}</span><span class="info-val">${esc(val)}</span></div>`;
}

// ── Stylesheet ──────────────────────────────────────────

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{
  padding:16px 14px;
  color:var(--vscode-foreground);
  font-family:var(--vscode-font-family);
  font-size:13px;
  line-height:1.4;
}

/* ── Hero ── */
.hero{display:flex;flex-direction:column;align-items:center;margin-bottom:20px}
.hero-icon{
  display:flex;
  align-items:center;justify-content:center;
  margin-bottom:10px;
}
.hero-title{font-size:16px;font-weight:600;margin-bottom:4px}
.hero-sub{font-size:12px;color:var(--vscode-descriptionForeground);line-height:1.5}

/* ── Buttons ── */
.btn{
  display:block;width:100%;
  padding:7px 12px;
  border:none;border-radius:3px;
  cursor:pointer;
  font-family:var(--vscode-font-family);
  font-size:13px;text-align:center;
}
.btn.full{margin-top:8px}

.primary{
  background:var(--vscode-button-background);
  color:var(--vscode-button-foreground);
}
.primary:hover{background:var(--vscode-button-hoverBackground)}

.secondary{
  background:var(--vscode-button-secondaryBackground);
  color:var(--vscode-button-secondaryForeground);
  border:1px solid var(--vscode-widget-border,rgba(128,128,128,.35));
}
.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}

.outline-danger{
  background:transparent;
  color:var(--vscode-errorForeground);
  border:1px solid var(--vscode-errorForeground);
  opacity:.8;
}
.outline-danger:hover{opacity:1}

/* ── Stacked buttons ── */
.stack .btn+.btn{margin-top:6px}

/* ── Separator ── */
.sep{
  height:1px;
  background:var(--vscode-widget-border,rgba(128,128,128,.2));
  margin:16px 0;
}

/* ── Text links ── */
.row{display:flex;gap:4px;justify-content:center;align-items:center}
.row.mt{margin-top:14px}
.dot-sep{
  width:3px;height:3px;border-radius:50%;
  background:var(--vscode-descriptionForeground);
  opacity:.5;
}
.link{
  background:none;border:none;
  color:var(--vscode-textLink-foreground);
  cursor:pointer;
  font-family:var(--vscode-font-family);
  font-size:12px;padding:2px 4px;
}
.link:hover{color:var(--vscode-textLink-activeForeground);text-decoration:underline}

.footnote{
  text-align:center;
  font-size:11px;
  color:var(--vscode-descriptionForeground);
  margin-top:14px;
  line-height:1.5;
  opacity:.8;
}

/* ── Status card ── */
.status-card{
  display:flex;align-items:center;gap:10px;
  padding:10px 12px;margin-bottom:14px;
  border-radius:4px;
  background:var(--vscode-editor-background);
  border:1px solid var(--vscode-widget-border,rgba(128,128,128,.2));
}
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.status-dot.active{background:var(--vscode-testing-iconPassed,#4caf50)}
.status-dot.pulse{
  background:var(--vscode-charts-yellow,#cca700);
  animation:pulse 1.5s ease-in-out infinite;
}
.status-dot.err{background:var(--vscode-testing-iconFailed,#f44747)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.status-text{font-weight:600;font-size:13px}

/* ── Info table ── */
.info-table{margin-bottom:14px}
.info-row{
  display:flex;justify-content:space-between;
  padding:5px 0;font-size:12px;
  border-bottom:1px solid var(--vscode-widget-border,rgba(128,128,128,.1));
}
.info-row:last-child{border-bottom:none}
.info-key{color:var(--vscode-descriptionForeground)}
.info-val{color:var(--vscode-foreground);text-align:right}

/* ── Error ── */
.error-box{
  font-size:12px;line-height:1.5;
  color:var(--vscode-errorForeground);
  background:var(--vscode-inputValidation-errorBackground,rgba(255,0,0,.08));
  border:1px solid var(--vscode-inputValidation-errorBorder,rgba(255,0,0,.25));
  border-radius:4px;padding:8px 10px;margin-bottom:14px;
  word-break:break-word;
}

.hint{
  text-align:center;font-size:12px;
  color:var(--vscode-descriptionForeground);
  line-height:1.5;
}
`;
