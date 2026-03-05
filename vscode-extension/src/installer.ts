import * as cp from "child_process";
import * as vscode from "vscode";

/** Result of detecting the shadow CLI binary. */
export interface DetectResult {
  found: boolean;
  path?: string;
  version?: string;
  supportsJson?: boolean;
}

/** Check if shadow CLI is installed and return its path + version. */
export async function detectBinary(): Promise<DetectResult> {
  try {
    const whichPath = await execSimple("which shadow");
    if (!whichPath) return { found: false };

    const versionOut = await execFileSimple(whichPath, ["--version"]);
    const version = versionOut?.replace("shadow version:", "").trim() ?? "unknown";
    const supportsJson = await supportsJSONMode(whichPath);

    return { found: true, path: whichPath, version, supportsJson };
  } catch {
    return { found: false };
  }
}

/**
 * Prompt the user to install the shadow CLI.
 * Returns the binary path if installation succeeds, undefined otherwise.
 */
export async function promptInstall(): Promise<string | undefined> {
  const platform = process.platform;

  if (platform === "win32") {
    const choice = await vscode.window.showInformationMessage(
      "Shadow CLI is not installed. One-click install is not yet available on Windows.",
      "Open install docs",
      "Retry detection"
    );
    if (choice === "Open install docs") {
      vscode.env.openExternal(vscode.Uri.parse("https://github.com/go-johnnyhe/shadow#install"));
    }
    if (choice === "Retry detection") {
      const result = await detectBinary();
      return result.path;
    }
    return undefined;
  }

  // macOS / Linux
  const choice = await vscode.window.showInformationMessage(
    "Shadow CLI is required but not found. Install now?",
    "Install now (recommended)",
    "Not now"
  );

  if (choice !== "Install now (recommended)") return undefined;

  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Installing Shadow CLI\u2026" },
    async () => {
      try {
        await execSimple(
          'curl -fsSL https://raw.githubusercontent.com/go-johnnyhe/shadow/main/install.sh | bash'
        );

        // Verify
        const result = await detectBinary();
        if (result.found && result.supportsJson) {
          vscode.window.showInformationMessage(`Shadow CLI installed (${result.version})`);
          return result.path;
        }
        if (result.found && !result.supportsJson) {
          vscode.window.showErrorMessage(
            "Installed Shadow CLI does not support extension mode (--json). Please upgrade to a newer release."
          );
          return undefined;
        }
        vscode.window.showErrorMessage("Installation completed but compatible binary not found in PATH.");
        return undefined;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Installation failed: ${msg}`);
        return undefined;
      }
    }
  );
}

/**
 * Ensure shadow binary is available. Prompts to install if missing.
 * Returns the binary path or undefined if unavailable.
 */
export async function ensureBinary(): Promise<string | undefined> {
  const result = await detectBinary();
  if (result.found && result.supportsJson) return result.path;
  if (result.found && !result.supportsJson) {
    const choice = await vscode.window.showErrorMessage(
      `Shadow CLI ${result.version ?? ""} is installed but does not support extension mode (--json).`,
      "Upgrade now",
      "Open upgrade docs"
    );
    if (choice === "Upgrade now") {
      return promptInstall();
    }
    if (choice === "Open upgrade docs") {
      vscode.env.openExternal(vscode.Uri.parse("https://github.com/go-johnnyhe/shadow#install"));
    }
    return undefined;
  }
  return promptInstall();
}

// -------------------------------------------------------------------

async function supportsJSONMode(binaryPath: string): Promise<boolean> {
  try {
    const helpOut = await execFileSimple(binaryPath, ["start", "--help"]);
    return helpOut.includes("--json");
  } catch {
    return false;
  }
}

function execSimple(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(command, { timeout: 30_000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

function execFileSimple(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.execFile(file, args, { timeout: 30_000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}
