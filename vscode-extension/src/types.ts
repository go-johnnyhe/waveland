/** States for the Shadow session state machine. */
export enum SessionState {
  Idle = "idle",
  Starting = "starting",
  RunningHost = "running_host",
  RunningJoiner = "running_joiner",
  Stopping = "stopping",
  Error = "error",
}

/** JSON event emitted by `shadow start/join --json`. */
export interface ShadowEvent {
  event: string;
  message: string;
  join_url?: string;
  join_command?: string;
  file_count?: number;
  rel_path?: string;
  timestamp: string;
}

/** Info tracked for the active session. */
export interface SessionInfo {
  mode: "host" | "joiner";
  joinUrl?: string;
  joinCommand?: string;
  workspacePath?: string;
  fileCount?: number;
  readOnly?: boolean;
  hostReadOnly?: boolean;
  lastError?: string;
}
