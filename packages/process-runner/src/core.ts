import { spawn as childSpawn } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import { DEFAULT_TIMEOUTS } from "./constants.js";
import { createLogWriter, rotateLogFile } from "./log-manager.js";
import {
  type ProcessRunnerError,
  ProcessRunnerError as ProcessRunnerErrorValue,
  type ProcessRunnerOptions,
  type ProcessSessionInfo,
  type SessionResources,
} from "./types.js";
import { validateCommand, validateSessionName, withTimeout } from "./utils.js";

// Re-export types for convenience
export type { ProcessRunnerOptions, ProcessSessionInfo };
export { ProcessRunnerErrorValue as ProcessRunnerError };

export class ProcessRunnerService {
  private readonly sessionDir: string;
  private readonly logDir: string;
  private readonly resources: Map<string, SessionResources> = new Map(); // Track all resources per session
  private readonly lockFile: string;

  constructor(options?: ProcessRunnerOptions) {
    this.sessionDir =
      options?.sessionDir ??
      process.env.OPEN_COMPOSER_SESSION_DIR ??
      path.resolve(process.cwd(), ".open-composer");
    this.logDir = options?.logDir ?? process.env.TMPDIR ?? "/tmp";
    this.lockFile = path.join(this.sessionDir, "sessions.lock");
  }

  private acquireLock(): Effect.Effect<void, ProcessRunnerError> {
    return withTimeout(
      Effect.tryPromise({
        try: async () => {
          const lockDir = path.dirname(this.lockFile);
          await fs.mkdir(lockDir, { recursive: true });

          // Try to create lock file exclusively
          try {
            await fs.writeFile(this.lockFile, process.pid.toString(), {
              flag: "wx",
            });
          } catch (_error) {
            // Lock file already exists, wait and retry
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            while (attempts < maxAttempts) {
              try {
                await fs.writeFile(this.lockFile, process.pid.toString(), {
                  flag: "wx",
                });
                break;
              } catch {
                await new Promise((resolve) => setTimeout(resolve, 100));
                attempts++;
              }
            }
            if (attempts >= maxAttempts) {
              throw new Error("Failed to acquire file lock after timeout");
            }
          }
        },
        catch: (error) =>
          ProcessRunnerErrorValue(
            `Failed to acquire file lock: ${error instanceof Error ? error.message : String(error)}`,
          ),
      }),
      DEFAULT_TIMEOUTS.FILE_OPERATION * 2, // Longer timeout for locking
      "File lock acquisition timed out",
    );
  }

  private releaseLock(): Effect.Effect<void, ProcessRunnerError> {
    return Effect.tryPromise({
      try: async () => {
        try {
          await fs.unlink(this.lockFile);
        } catch {
          // Lock file might have been removed by another process, ignore
        }
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to release file lock: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  static make(
    options?: ProcessRunnerOptions,
  ): Effect.Effect<ProcessRunnerService, never> {
    return Effect.sync(() => new ProcessRunnerService(options));
  }

  private initializeSessionDir(): Effect.Effect<void, ProcessRunnerError> {
    return Effect.tryPromise({
      try: async () => {
        // Create both session and log directories
        await fs.mkdir(this.sessionDir, { recursive: true });
        await fs.mkdir(this.logDir, { recursive: true });
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to create directories: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private readSessions(): Effect.Effect<
    ProcessSessionInfo[],
    ProcessRunnerError
  > {
    return Effect.tryPromise({
      try: async () => {
        const sessionFile = path.join(this.sessionDir, "sessions.json");
        try {
          const data = await fs.readFile(sessionFile, "utf-8");

          // Try to parse JSON
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch (parseError) {
            console.warn(
              `Corrupted sessions.json file, attempting recovery: ${parseError}`,
            );

            // Try to recover by finding valid JSON objects
            const recovered = this.recoverCorruptedSessions(data);
            if (recovered.length > 0) {
              console.log(
                `Recovered ${recovered.length} sessions from corrupted file`,
              );
              // Save the recovered data
              await this.writeSessions(recovered);
              return recovered;
            }

            // If recovery fails, backup the corrupted file and start fresh
            const backupFile = `${sessionFile}.corrupted.${Date.now()}`;
            await fs.writeFile(backupFile, data);
            console.warn(
              `Backed up corrupted sessions to ${backupFile}, starting with empty sessions`,
            );
            return [];
          }

          // Validate the parsed data structure
          if (!Array.isArray(parsed)) {
            throw new Error("Sessions file does not contain an array");
          }

          // Validate each session object
          const validSessions: ProcessSessionInfo[] = [];
          for (const session of parsed as ProcessSessionInfo[]) {
            if (this.isValidSessionInfo(session)) {
              validSessions.push(session);
            } else {
              console.warn(
                `Skipping invalid session: ${JSON.stringify(session)}`,
              );
            }
          }

          return this.dedupeSessions(validSessions);
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            (error as NodeJS.ErrnoException).code === "ENOENT"
          ) {
            // File doesn't exist, return empty array
            return [];
          }
          throw error;
        }
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to read sessions: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private recoverCorruptedSessions(data: string): ProcessSessionInfo[] {
    try {
      // Try to extract valid JSON objects from the corrupted data
      const sessions: ProcessSessionInfo[] = [];
      const lines = data.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const session = JSON.parse(trimmed);
            if (this.isValidSessionInfo(session)) {
              sessions.push(session);
            }
          } catch {
            // Skip invalid JSON objects
          }
        }
      }

      return sessions;
    } catch {
      return [];
    }
  }

  private isValidSessionInfo(obj: unknown): obj is ProcessSessionInfo {
    if (!obj || typeof obj !== "object") return false;

    const candidate = obj as Record<string, unknown>;

    return (
      typeof candidate.sessionName === "string" &&
      typeof candidate.pid === "number" &&
      typeof candidate.command === "string" &&
      typeof candidate.logFile === "string" &&
      candidate.sessionName.length > 0 &&
      candidate.command.length > 0 &&
      candidate.logFile.length > 0 &&
      Number.isInteger(candidate.pid) &&
      candidate.pid > 0
    );
  }

  private writeSessions(
    sessions: ProcessSessionInfo[],
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(this.acquireLock(), () =>
      withTimeout(
        Effect.tryPromise({
          try: async () => {
            // Ensure directory exists
            await fs.mkdir(this.sessionDir, { recursive: true });

            const sessionFile = path.join(this.sessionDir, "sessions.json");

            // Write the sessions to file
            await fs.writeFile(sessionFile, JSON.stringify(sessions, null, 2));
          },
          catch: (error) =>
            ProcessRunnerErrorValue(
              `Failed to write session metadata: ${error instanceof Error ? error.message : String(error)}`,
            ),
        }),
        DEFAULT_TIMEOUTS.FILE_OPERATION,
        "Session file write operation timed out",
      ),
    ).pipe(
      Effect.tapError(() => this.releaseLock()), // Release lock on error
      Effect.flatMap(() => this.releaseLock()), // Release lock on success
    );
  }

  private modifySessions(
    modifier: (sessions: ProcessSessionInfo[]) => ProcessSessionInfo[],
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(this.acquireLock(), () =>
      Effect.flatMap(this.readSessions(), (currentSessions) => {
        const modifiedSessions = modifier(currentSessions);
        return withTimeout(
          Effect.tryPromise({
            try: async () => {
              // Ensure directory exists
              await fs.mkdir(this.sessionDir, { recursive: true });

              const sessionFile = path.join(this.sessionDir, "sessions.json");

              // Write the modified sessions to file
              await fs.writeFile(
                sessionFile,
                JSON.stringify(modifiedSessions, null, 2),
              );
            },
            catch: (error) =>
              ProcessRunnerErrorValue(
                `Failed to write session metadata: ${error instanceof Error ? error.message : String(error)}`,
              ),
          }),
          DEFAULT_TIMEOUTS.FILE_OPERATION,
          "Session file write operation timed out",
        );
      }),
    ).pipe(
      Effect.tapError(() => this.releaseLock()), // Release lock on error
      Effect.flatMap(() => this.releaseLock()), // Release lock on success
    );
  }

  newSession(
    sessionName: string,
    command: string,
  ): Effect.Effect<ProcessSessionInfo, ProcessRunnerError> {
    return Effect.flatMap(
      validateSessionName(sessionName),
      (validSessionName) =>
        Effect.flatMap(validateCommand(command), (validCommand) =>
          Effect.flatMap(this.initializeSessionDir(), () =>
            withTimeout(
              Effect.tryPromise({
                try: async () => {
                  const logFile = path.join(
                    this.logDir,
                    `${validSessionName}-${Date.now()}.log`,
                  );

                  // Lazy-load bun-pty to avoid import-time native library loading
                  const { spawn } = await import("bun-pty");

                  // Spawn process in a pseudo-terminal
                  const term = spawn("bash", ["-c", validCommand], {
                    name: "xterm",
                    cwd: process.cwd(),
                    env: process.env as Record<string, string>,
                  });
                  const pid = term.pid;

                  // Create log writer with rotation
                  const logWriter = createLogWriter(logFile, () =>
                    rotateLogFile(logFile),
                  );

                  term.onData(logWriter.write);

                  // Set up cleanup on PTY exit
                  const cleanup = () => this.cleanupSession(validSessionName);
                  term.onExit(cleanup);

                  // Store all resources for this session
                  const resources: SessionResources = {
                    pty: term,
                    logStream: {
                      write: logWriter.write,
                      close: logWriter.close,
                    },
                    bytesWritten: 0, // Will be tracked by logWriter
                    logFile,
                  };
                  this.resources.set(validSessionName, resources);

                  return { term, pid, logFile };
                },
                catch: (error) =>
                  ProcessRunnerErrorValue(
                    `Failed to spawn process: ${error instanceof Error ? error.message : String(error)}`,
                  ),
              }),
              DEFAULT_TIMEOUTS.PROCESS_SPAWN,
              `Process spawn timed out for session ${validSessionName}`,
            ),
          ).pipe(
            Effect.flatMap(({ pid, logFile }) => {
              const sessionInfo: ProcessSessionInfo = {
                sessionName: validSessionName,
                pid,
                command: validCommand,
                logFile,
              };
              return Effect.map(
                this.modifySessions((sessions) => {
                  const filtered = sessions.filter(
                    (session) => session.sessionName !== validSessionName,
                  );
                  filtered.push(sessionInfo);
                  return filtered;
                }),
                () => sessionInfo,
              );
            }),
          ),
        ),
    );
  }

  attachSession(
    sessionName: string,
    options: { lines?: number; search?: string } = {},
  ): Effect.Effect<boolean, ProcessRunnerError> {
    return Effect.flatMap(
      validateSessionName(sessionName),
      (validSessionName) =>
        Effect.flatMap(this.readSessions(), (sessions) => {
          const session = this.findLatestSessionEntry(
            sessions,
            validSessionName,
          );
          if (!session) {
            return Effect.fail(
              ProcessRunnerErrorValue(`Session ${validSessionName} not found`),
            );
          }

          return Effect.flatMap(
            this.isProcessRunning(session.pid, session.command),
            (isRunning) => {
              if (!isRunning) {
                return this.handleCompletedSession(
                  validSessionName,
                  session,
                  options,
                ).pipe(Effect.as(false));
              }

              return Effect.async<boolean, ProcessRunnerError>((resume) => {
                this.attachToSession(
                  validSessionName,
                  session,
                  options,
                  resume,
                ).catch((error) => {
                  resume(
                    Effect.fail(
                      ProcessRunnerErrorValue(
                        `Async attach failed: ${error.message}`,
                      ),
                    ),
                  );
                });
              });
            },
          );
        }),
    );
  }

  private async attachToSession(
    sessionName: string,
    session: ProcessSessionInfo,
    options: { lines?: number; search?: string },
    resume: (effect: Effect.Effect<boolean, ProcessRunnerError>) => void,
  ): Promise<void> {
    try {
      await this.displayLogSnapshot(session, options);

      // Try to use existing PTY from resources first
      const existingResources = this.resources.get(sessionName);
      if (existingResources) {
        this.attachToPty(sessionName, resume);
        return;
      }

      // Since PTY is not available in current instance, we'll stream the log file
      // and provide a message to the user
      console.log(`Attaching to session: ${sessionName} (Ctrl+C to detach)`);
      console.log(`Following log output from: ${session.logFile}`);
      console.log(`Original PID: ${session.pid}`);
      console.log(
        "Note: You can see live output but cannot send input to the original process.",
      );
      console.log(
        "To fully interact with the session, restart it or use a different terminal multiplexer.\n",
      );

      let position = await fs
        .stat(session.logFile)
        .then((stats) => stats.size)
        .catch(() => 0);

      let reading = false;
      let pendingRead = false;
      let watcherClosed = false;

      const readNewContent = async () => {
        if (reading) {
          pendingRead = true;
          return;
        }
        reading = true;
        try {
          const handle = await fs.open(session.logFile, "r");
          try {
            const stats = await handle.stat();
            if (stats.size < position) {
              position = 0; // File rotated or truncated
            }
            const bytesToRead = stats.size - position;
            if (bytesToRead > 0) {
              const buffer = Buffer.alloc(Number(bytesToRead));
              await handle.read(buffer, 0, Number(bytesToRead), position);
              position = stats.size;
              process.stdout.write(buffer.toString());
            }
          } finally {
            await handle.close();
          }
        } catch (error) {
          console.warn(
            `Failed to read live log updates for ${sessionName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        } finally {
          reading = false;
          if (pendingRead) {
            pendingRead = false;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            readNewContent();
          }
        }
      };

      const watcher = fsSync.watch(
        session.logFile,
        { persistent: true },
        () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          readNewContent();
        },
      );

      watcher.on("error", (error) => {
        if (!watcherClosed) {
          console.warn(
            `File watcher error for ${sessionName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });

      // Prime the stream in case new data was written between stat and watch setup
      await readNewContent();

      let isExiting = false;

      let detachHandler: () => void;

      const stopWatcher = () => {
        if (!watcherClosed) {
          watcherClosed = true;
          watcher.close();
        }
      };

      const cleanup = (invokeClose: boolean) => {
        if (invokeClose) {
          stopWatcher();
        }
        process.removeListener("SIGINT", detachHandler);
        clearInterval(interval);
      };

      // Handle Ctrl+C to detach
      detachHandler = () => {
        if (!isExiting) {
          isExiting = true;
          console.log("\nDetaching from session...");
          cleanup(true);
          resume(Effect.succeed(true));
        }
      };

      process.on("SIGINT", detachHandler);

      // Poll for additional data every second to catch missed events
      const interval = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        readNewContent();
      }, 1000);

      watcher.on("close", () => {
        if (!isExiting) {
          isExiting = true;
          cleanup(false);
          resume(Effect.succeed(true));
        } else {
          cleanup(false);
        }
      });
    } catch (error) {
      resume(
        Effect.fail(
          ProcessRunnerErrorValue(
            `Failed to attach to session: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ),
      );
    }
  }

  private cleanupSession(sessionName: string): void {
    const resources = this.resources.get(sessionName);
    if (resources) {
      try {
        // Close log stream
        if (
          resources.logStream &&
          typeof resources.logStream.close === "function"
        ) {
          resources.logStream.close();
        }

        // Clear any cleanup timeout
        if (resources.cleanupTimeout) {
          clearTimeout(resources.cleanupTimeout);
        }

        // Remove from resource tracking
        this.resources.delete(sessionName);
      } catch (error) {
        // Log cleanup errors but don't throw
        console.warn(`Failed to cleanup session ${sessionName}:`, error);
      }
    }
  }

  private attachToPty(
    sessionName: string,
    resume: (effect: Effect.Effect<boolean, ProcessRunnerError>) => void,
  ) {
    const resources = this.resources.get(sessionName);
    if (!resources) {
      resume(
        Effect.fail(
          ProcessRunnerErrorValue(`PTY for session ${sessionName} not found`),
        ),
      );
      return;
    }

    const { pty: term } = resources;

    // Connect PTY to stdio
    term.onData((data: string | Buffer) => process.stdout.write(data));
    const inputHandler = (data: Buffer) => term.write(data.toString());
    process.stdin.on("data", inputHandler);

    term.onExit(({ exitCode }: { exitCode?: number }) => {
      process.stdin.removeListener("data", inputHandler);
      resume(
        exitCode === 0
          ? Effect.succeed(true)
          : Effect.fail(
              ProcessRunnerErrorValue(
                `Session exited with code ${exitCode}`,
                exitCode ?? undefined,
              ),
            ),
      );
    });
  }

  listSessions(): Effect.Effect<ProcessSessionInfo[], ProcessRunnerError> {
    return this.readSessions();
  }

  killSession(sessionName: string): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(
      validateSessionName(sessionName),
      (validSessionName) =>
        Effect.flatMap(
          this.modifySessions((sessions) => {
            const session = this.findLatestSessionEntry(
              sessions,
              validSessionName,
            );
            if (!session) {
              throw new Error(`Session ${validSessionName} not found`);
            }

            const resources = this.resources.get(validSessionName);
            if (resources) {
              // Kill the PTY process
              resources.pty.kill("SIGTERM");

              // Schedule cleanup after a short delay to allow PTY to exit gracefully
              resources.cleanupTimeout = setTimeout(() => {
                this.cleanupSession(validSessionName);
              }, 1000);
            } else {
              // Fallback: try to kill by PID if PTY not found
              try {
                process.kill(session.pid, "SIGTERM");
              } catch (error) {
                // If the process is already dead, that's fine
                if (
                  error instanceof Error &&
                  "code" in error &&
                  (error as NodeJS.ErrnoException).code === "ESRCH"
                ) {
                  // Process not found (already dead) - this is OK
                } else {
                  throw new Error(
                    `Failed to kill process ${session.pid}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }
            }

            // Filter out the killed session
            return sessions.filter((s) => s.sessionName !== validSessionName);
          }),
          () => Effect.succeed(void 0),
        ),
    );
  }

  private isProcessRunning(
    pid: number,
    expectedCommand?: string,
  ): Effect.Effect<boolean, never> {
    const checkEffect = Effect.async<boolean, never>((resume) => {
      const platform = process.platform;

      if (platform === "linux" || platform === "darwin") {
        // On Unix-like systems, check /proc or use ps with more detailed info
        if (platform === "linux" && expectedCommand) {
          // Try to read command line from /proc for verification
          Promise.all([
            fs.access(`/proc/${pid}`).catch(() => {
              throw new Error("Process not found");
            }),
            fs.readFile(`/proc/${pid}/cmdline`, "utf-8").catch(() => ""),
          ])
            .then(([, cmdline]) => {
              // Verify the command matches (basic check)
              const isRunning =
                cmdline.includes("bash") ||
                cmdline.includes(expectedCommand.split(" ")[0]);
              resume(Effect.succeed(isRunning));
            })
            .catch(() => resume(Effect.succeed(false)));
        } else {
          // Fallback to basic process check
          try {
            const proc = childSpawn(
              "ps",
              ["-p", pid.toString(), "-o", "pid="],
              {
                stdio: "pipe",
              },
            );
            proc.on("close", (code) => resume(Effect.succeed(code === 0)));
            proc.on("error", () => resume(Effect.succeed(false)));
          } catch {
            resume(Effect.succeed(false));
          }
        }
      } else if (platform === "win32") {
        // Windows: use tasklist or wmic for better reliability
        const proc = childSpawn("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], {
          stdio: "pipe",
        });
        let output = "";
        proc.stdout?.on("data", (data) => {
          output += data.toString();
        });
        proc.on("close", (code) => {
          const isRunning = code === 0 && output.includes(pid.toString());
          resume(Effect.succeed(isRunning));
        });
        proc.on("error", () => resume(Effect.succeed(false)));
      } else {
        // Fallback for other platforms
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          resume(Effect.succeed(true));
        } catch {
          resume(Effect.succeed(false));
        }
      }
    });

    return withTimeout(
      checkEffect,
      DEFAULT_TIMEOUTS.PROCESS_CHECK,
      `Process check timed out for PID ${pid}`,
    ).pipe(
      Effect.catchAll(() => Effect.succeed(false)), // Timeout or error means process is not running
    );
  }

  private displayLogSnapshot(
    session: ProcessSessionInfo,
    options: { lines?: number; search?: string },
    fallbackCommand: string[] | null = null,
  ): Promise<void> {
    const hasLines = typeof options.lines === "number";
    const hasSearch = typeof options.search === "string";

    if (!hasLines && !hasSearch && !fallbackCommand) {
      return Promise.resolve();
    }

    const normalizeNewline = (text: string) =>
      text.endsWith("\n") ? text : `${text}\n`;

    return fs
      .readFile(session.logFile, "utf-8")
      .then((contents) => {
        if (contents.length === 0) {
          return;
        }

        const lines = contents.split(/\r?\n/);

        if (hasLines) {
          const limit = Math.max(0, options.lines as number);
          if (limit === 0) {
            return;
          }
          const selected = lines.slice(-limit).join("\n");
          if (selected.length > 0) {
            process.stdout.write(normalizeNewline(selected));
          }
          return;
        }

        if (hasSearch) {
          const pattern = options.search as string;
          let matcher: RegExp | null = null;
          try {
            matcher = new RegExp(pattern);
          } catch {
            matcher = null;
          }
          const matches = lines.filter((line) =>
            matcher ? matcher.test(line) : line.includes(pattern),
          );
          if (matches.length > 0) {
            process.stdout.write(normalizeNewline(matches.join("\n")));
          }
          return;
        }

        if (fallbackCommand) {
          process.stdout.write(normalizeNewline(contents));
        }
      })
      .catch((error: unknown) => {
        throw new Error(
          `Failed to read log file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  private handleCompletedSession(
    sessionName: string,
    session: ProcessSessionInfo,
    options: { lines?: number; search?: string },
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.tryPromise({
      try: async () => {
        console.log(
          `Session ${sessionName} is not running (last PID ${session.pid}).`,
        );

        const logExists = await fs
          .access(session.logFile)
          .then(() => true)
          .catch(() => false);

        if (!logExists) {
          console.log("No log output is available for this session.");
          return;
        }

        await this.displayLogSnapshot(session, options, [
          "cat",
          session.logFile,
        ]);

        console.log("\n--- end of session log ---\n");
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to read session logs: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private dedupeSessions(sessions: ProcessSessionInfo[]): ProcessSessionInfo[] {
    const seen = new Set<string>();
    const deduped: ProcessSessionInfo[] = [];

    for (let index = sessions.length - 1; index >= 0; index--) {
      const session = sessions[index];
      if (!seen.has(session.sessionName)) {
        seen.add(session.sessionName);
        deduped.unshift(session);
      }
    }

    return deduped;
  }

  private findLatestSessionEntry(
    sessions: ProcessSessionInfo[],
    sessionName: string,
  ): ProcessSessionInfo | undefined {
    for (let index = sessions.length - 1; index >= 0; index--) {
      const session = sessions[index];
      if (session.sessionName === sessionName) {
        return session;
      }
    }
    return undefined;
  }
}
