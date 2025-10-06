// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ProcessRunnerOptions {
  readonly runDir?: string; // Directory for run metadata
  readonly logDir?: string; // Directory for log files
}

export interface ProcessRunInfo {
  readonly runName: string;
  readonly pid: number;
  readonly command: string;
  readonly logFile: string;
  readonly ptySocket?: string; // Unix socket or named pipe for PTY
}

export type ProcessRunnerError = {
  readonly _tag: "ProcessRunnerError";
  readonly message: string;
  readonly exitCode?: number;
  readonly stderr?: string;
};

export const ProcessRunnerError = (
  message: string,
  exitCode?: number,
  stderr?: string,
): ProcessRunnerError => ({
  _tag: "ProcessRunnerError",
  message,
  ...(exitCode !== undefined && { exitCode }),
  ...(stderr !== undefined && { stderr }),
});

// PTY interface for bun-pty
export interface PtyProcess {
  pid: number;
  onData(callback: (data: string | Buffer) => void): void;
  onExit(callback: (event: { exitCode?: number }) => void): void;
  write(data: string): void;
  kill(signal: string): void;
}

// Resource tracking for proper cleanup
export interface RunResources {
  pty: PtyProcess;
  logStream: { write: (data: string | Buffer) => void; close: () => void };
  cleanupTimeout?: NodeJS.Timeout;
  bytesWritten: number;
  logFile: string;
}
