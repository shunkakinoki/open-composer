/**
 * PTY Configuration and Type Definitions (Bun-native version)
 *
 * Server-managed PTY with persistent snapshots for instant recovery
 */

/**
 * Request body for creating a new PTY
 */
export interface CreatePTYRequest {
  /** Command to execute (e.g., ['bash', '-l'] or ['zsh']) */
  cmd: string[]
  /** Working directory (defaults to user's home) */
  cwd?: string
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>
  /** Terminal columns (width) */
  cols: number
  /** Terminal rows (height) */
  rows: number
}

/**
 * Response from creating a PTY
 */
export interface CreatePTYResponse {
  /** Unique PTY identifier */
  ptyID: string
}

/**
 * Request body for writing input to a PTY
 */
export interface PTYInputRequest {
  /** UTF-8 string data to write (keyboard input, etc.) */
  data: string
}

/**
 * Request body for resizing a PTY
 */
export interface PTYResizeRequest {
  /** New terminal width in columns */
  cols: number
  /** New terminal height in rows */
  rows: number
}

/**
 * Response containing a serialized terminal snapshot
 */
export interface PTYSnapshotResponse {
  /** Serialized terminal state (from @xterm/addon-serialize) */
  data: string
}

/**
 * Request body for restoring a PTY from a snapshot
 */
export interface PTYRestoreRequest {
  /** Previously serialized terminal state */
  snapshot: string
}

/**
 * SSE event types for PTY streaming
 */
export type PTYStreamEvent =
  | { type: 'snapshot'; data: string }
  | { type: 'data'; data: string }
  | { type: 'exit'; code: number; signal?: number }

/**
 * PTY session metadata
 */
export interface PTYMetadata {
  id: string
  sessionID: string
  cmd: string[]
  cwd: string
  cols: number
  rows: number
  createdAt: string
  lastActivity: string
}
