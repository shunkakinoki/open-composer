import { spawn } from "node:child_process";
import * as Effect from "effect/Effect";

export interface TmuxCommandOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string>;
}

export interface TmuxCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface TmuxSessionInfo {
  readonly sessionName: string;
  readonly pid: number;
  readonly attached: boolean;
  readonly windows: number;
}

export type TmuxCommandError = {
  readonly _tag: "TmuxCommandError";
  readonly message: string;
  readonly exitCode: number;
  readonly stderr: string;
};

export const TmuxCommandError = (
  message: string,
  exitCode: number,
  stderr: string,
): TmuxCommandError => ({
  _tag: "TmuxCommandError",
  message,
  exitCode,
  stderr,
});

export class TmuxService {
  constructor(private readonly defaultOptions?: TmuxCommandOptions) {}

  static make(options?: TmuxCommandOptions): Effect.Effect<TmuxService, never> {
    return Effect.sync(() => new TmuxService(options));
  }

  /**
   * Run a tmux command with the given arguments
   */
  run(
    args: readonly string[],
    options?: TmuxCommandOptions,
  ): Effect.Effect<TmuxCommandResult, TmuxCommandError> {
    return Effect.async((resume) => {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const tmuxProcess = spawn("tmux", args, {
        cwd: mergedOptions.cwd,
        env: { ...process.env, ...mergedOptions.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      tmuxProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      tmuxProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      tmuxProcess.on("close", (code) => {
        if (code === 0 || code === null) {
          resume(Effect.succeed({ stdout, stderr, exitCode: code ?? 0 }));
        } else {
          resume(
            Effect.fail(
              TmuxCommandError(
                `tmux command failed with exit code ${code}`,
                code ?? 1,
                stderr,
              ),
            ),
          );
        }
      });

      tmuxProcess.on("error", (error) => {
        resume(
          Effect.fail(
            TmuxCommandError(`Failed to execute tmux: ${error.message}`, 1, ""),
          ),
        );
      });
    });
  }

  /**
   * Create a new tmux session with the given name and command
   */
  newSession(
    sessionName: string,
    command?: string,
    options?: TmuxCommandOptions & {
      readonly detached?: boolean;
      readonly windowName?: string;
    },
  ): Effect.Effect<number, TmuxCommandError> {
    const args = ["new-session"];

    if (options?.detached !== false) {
      args.push("-d");
    }

    if (options?.windowName) {
      args.push("-n", options.windowName);
    }

    args.push("-s", sessionName);

    if (command) {
      args.push(command);
    }

    return this.run(args, options).pipe(
      Effect.flatMap(() => this.getSessionPid(sessionName)),
    );
  }

  /**
   * Get the PID of a tmux session
   */
  getSessionPid(sessionName: string): Effect.Effect<number, TmuxCommandError> {
    return this.run([
      "list-sessions",
      "-F",
      "#{session_name}:#{session_id}",
    ]).pipe(
      Effect.flatMap((result) => {
        const lines = result.stdout.trim().split("\n");
        for (const line of lines) {
          const [name, sessionId] = line.split(":");
          if (name === sessionName) {
            // Extract PID from session ID (format is like $1234)
            const pidMatch = sessionId.match(/\$(\d+)/);
            if (pidMatch) {
              return Effect.succeed(parseInt(pidMatch[1], 10));
            }
          }
        }
        return Effect.fail(
          TmuxCommandError(
            `Session ${sessionName} not found`,
            1,
            "Session not found in tmux list-sessions output",
          ),
        );
      }),
    );
  }

  /**
   * List all tmux sessions
   */
  listSessions(): Effect.Effect<readonly TmuxSessionInfo[], TmuxCommandError> {
    return this.run([
      "list-sessions",
      "-F",
      "#{session_name}:#{session_id}:#{session_attached}:#{session_windows}",
    ]).pipe(
      Effect.map((result) => {
        const lines = result.stdout.trim().split("\n");
        return lines
          .filter((line) => line.trim())
          .map((line) => {
            const [sessionName, sessionId, attached, windows] = line.split(":");
            const pidMatch = sessionId.match(/\$(\d+)/);
            return {
              sessionName,
              pid: pidMatch ? parseInt(pidMatch[1], 10) : 0,
              attached: attached === "1",
              windows: parseInt(windows, 10),
            };
          });
      }),
    );
  }

  /**
   * Kill a tmux session
   */
  killSession(sessionName: string): Effect.Effect<void, TmuxCommandError> {
    return this.run(["kill-session", "-t", sessionName]).pipe(
      Effect.map(() => void 0),
    );
  }

  /**
   * Check if tmux is available
   */
  isAvailable(): Effect.Effect<boolean, never> {
    return this.run(["-V"]).pipe(
      Effect.map(() => true),
      Effect.catchAll(() => Effect.succeed(false)),
    );
  }
}
