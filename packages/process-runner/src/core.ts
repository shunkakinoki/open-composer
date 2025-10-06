import { spawn as childSpawn } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import { DEFAULT_TIMEOUTS } from "./constants.js";
import { createLogWriter, rotateLogFile } from "./log-manager.js";
import {
  type ProcessRunnerError,
  ProcessRunnerError as ProcessRunnerErrorValue,
  type ProcessRunnerOptions,
  type ProcessRunInfo,
  type PtyProcess,
  type RunResources,
} from "./types.js";
import { validateCommand, validateRunName, withTimeout } from "./utils.js";

// Re-export types for convenience
export type { ProcessRunnerOptions, ProcessRunInfo };
export { ProcessRunnerErrorValue as ProcessRunnerError };

export class ProcessRunnerService {
  private readonly runDir: string;
  private readonly logDir: string;
  private readonly resources: Map<string, RunResources> = new Map(); // Track all resources per run
  private readonly lockFile: string;

  constructor(options?: ProcessRunnerOptions) {
    this.runDir =
      options?.runDir ??
      process.env.OPEN_COMPOSER_RUN_DIR ??
      path.resolve(os.homedir(), ".open-composer");
    this.logDir = options?.logDir ?? process.env.TMPDIR ?? "/tmp";
    this.lockFile = path.join(this.runDir, "runs.lock");
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

  private initializeRunDir(): Effect.Effect<void, ProcessRunnerError> {
    return Effect.tryPromise({
      try: async () => {
        // Create both run and log directories
        await fs.mkdir(this.runDir, { recursive: true });
        await fs.mkdir(this.logDir, { recursive: true });
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to create directories: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private readRuns(): Effect.Effect<
    ProcessRunInfo[],
    ProcessRunnerError
  > {
    return Effect.tryPromise({
      try: async () => {
        const runFile = path.join(this.runDir, "runs.json");
        try {
          const data = await fs.readFile(runFile, "utf-8");

          // Try to parse JSON
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch (parseError) {
            await Effect.runPromise(
              Console.warn(
                `Corrupted runs.json file, attempting recovery: ${parseError}`,
              ),
            );

            // Try to recover by finding valid JSON objects
            const recovered = this.recoverCorruptedRuns(data);
            if (recovered.length > 0) {
              await Effect.runPromise(
                Console.log(
                  `Recovered ${recovered.length} runs from corrupted file`,
                ),
              );
              // Save the recovered data
              await Effect.runPromise(this.writeRuns(recovered));
              return recovered;
            }

            // If recovery fails, backup the corrupted file and start fresh
            const backupFile = `${runFile}.corrupted.${Date.now()}`;
            await fs.writeFile(backupFile, data);
            await Effect.runPromise(
              Console.warn(
                `Backed up corrupted runs to ${backupFile}, starting with empty runs`,
              ),
            );
            return [];
          }

          // Validate the parsed data structure
          if (!Array.isArray(parsed)) {
            throw new Error("Runs file does not contain an array");
          }

          // Validate each run object
          const validRuns: ProcessRunInfo[] = [];
          for (const run of parsed as ProcessRunInfo[]) {
            if (this.isValidRunInfo(run)) {
              validRuns.push(run);
            } else {
              await Effect.runPromise(
                Console.warn(
                  `Skipping invalid run: ${JSON.stringify(run)}`,
                ),
              );
            }
          }

          return this.dedupeRuns(validRuns);
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
          `Failed to read runs: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private recoverCorruptedRuns(data: string): ProcessRunInfo[] {
    try {
      // Try to extract valid JSON objects from the corrupted data
      const runs: ProcessRunInfo[] = [];
      const lines = data.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const run = JSON.parse(trimmed);
            if (this.isValidRunInfo(run)) {
              runs.push(run);
            }
          } catch {
            // Skip invalid JSON objects
          }
        }
      }

      return runs;
    } catch {
      return [];
    }
  }

  private isValidRunInfo(obj: unknown): obj is ProcessRunInfo {
    if (!obj || typeof obj !== "object") return false;

    const candidate = obj as Record<string, unknown>;

    return (
      typeof candidate.runName === "string" &&
      typeof candidate.pid === "number" &&
      typeof candidate.command === "string" &&
      typeof candidate.logFile === "string" &&
      candidate.runName.length > 0 &&
      candidate.command.length > 0 &&
      candidate.logFile.length > 0 &&
      Number.isInteger(candidate.pid) &&
      candidate.pid > 0
    );
  }

  private writeRuns(
    runs: ProcessRunInfo[],
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(this.acquireLock(), () =>
      withTimeout(
        Effect.tryPromise({
          try: async () => {
            // Ensure directory exists
            await fs.mkdir(this.runDir, { recursive: true });

            const runFile = path.join(this.runDir, "runs.json");

            // Write the runs to file
            await fs.writeFile(runFile, JSON.stringify(runs, null, 2));
          },
          catch: (error) =>
            ProcessRunnerErrorValue(
              `Failed to write run metadata: ${error instanceof Error ? error.message : String(error)}`,
            ),
        }),
        DEFAULT_TIMEOUTS.FILE_OPERATION,
        "Run file write operation timed out",
      ),
    ).pipe(
      Effect.tapError(() => this.releaseLock()), // Release lock on error
      Effect.flatMap(() => this.releaseLock()), // Release lock on success
    );
  }

  private modifyRuns(
    modifier: (runs: ProcessRunInfo[]) => ProcessRunInfo[],
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(this.acquireLock(), () =>
      Effect.flatMap(this.readRuns(), (currentRuns) => {
        const modifiedRuns = modifier(currentRuns);
        return withTimeout(
          Effect.tryPromise({
            try: async () => {
              // Ensure directory exists
              await fs.mkdir(this.runDir, { recursive: true });

              const runFile = path.join(this.runDir, "runs.json");

              // Write the modified runs to file
              await fs.writeFile(
                runFile,
                JSON.stringify(modifiedRuns, null, 2),
              );
            },
            catch: (error) =>
              ProcessRunnerErrorValue(
                `Failed to write run metadata: ${error instanceof Error ? error.message : String(error)}`,
              ),
          }),
          DEFAULT_TIMEOUTS.FILE_OPERATION,
          "Run file write operation timed out",
        );
      }),
    ).pipe(
      Effect.tapError(() => this.releaseLock()), // Release lock on error
      Effect.flatMap(() => this.releaseLock()), // Release lock on success
    );
  }

  newRun(
    runName: string,
    command: string,
  ): Effect.Effect<ProcessRunInfo, ProcessRunnerError> {
    return Effect.flatMap(
      validateRunName(runName),
      (validRunName) =>
        Effect.flatMap(validateCommand(command), (validCommand) =>
          Effect.flatMap(this.initializeRunDir(), () =>
            withTimeout(
              Effect.tryPromise({
                try: async () => {
                  const logFile = path.join(
                    this.logDir,
                    `${validRunName}-${Date.now()}.log`,
                  );

                  // Use already imported childSpawn from top of file

                  // Parse command to determine best execution strategy
                  // const cmdParts = validCommand.trim().split(/\s+/);
                  // const _mainCmd = cmdParts[0];
                  // const _cmdArgs = cmdParts.slice(1);

                  // Always use PTY for true interactivity - this ensures all runs support input/output
                  let term: PtyProcess;

                  try {
                    const { spawn: ptySpawn } = await import("bun-pty");

                    const spawnOptions = {
                      name: "xterm-256color",
                      cwd: process.cwd(),
                      env: process.env as Record<string, string>,
                    };

                    // Use bash directly for better shell compatibility with loops and complex commands
                    // Create a temporary script file to avoid argument parsing issues
                    const scriptContent = `#!/bin/bash\n${validCommand}\nexit\n`;
                    const tempScriptPath = path.join(
                      os.tmpdir(),
                      `script-${validRunName}-${Date.now()}.sh`,
                    );

                    fsSync.writeFileSync(tempScriptPath, scriptContent, {
                      mode: 0o755,
                    });

                    // Log script execution for debugging if needed
                    // console.log("Created script:", tempScriptPath, "for command:", validCommand);

                    // Execute the script directly
                    term = ptySpawn("bash", [tempScriptPath], spawnOptions);

                    // Clean up script file after PTY exit
                    term.onExit(() => {
                      try {
                        fsSync.unlinkSync(tempScriptPath);
                      } catch (_error) {
                        // Ignore cleanup errors
                      }
                      this.cleanupRun(validRunName);
                    });

                    // Set up log capture
                    const logWriter = createLogWriter(logFile, () =>
                      rotateLogFile(logFile),
                    );
                    term.onData(logWriter.write);
                  } catch (error) {
                    throw new Error(
                      `Failed to spawn command "${validCommand}": ${error instanceof Error ? error.message : String(error)}`,
                    );
                  }

                  const pid = term.pid;
                  if (!pid || pid <= 0) {
                    throw new Error(
                      `Invalid PID received for command "${validCommand}"`,
                    );
                  }

                  // For detached processes, we don't capture stdout/stderr directly
                  // Instead, logs are managed through file watching during attachment
                  // Set up cleanup on process exit
                  const cleanup = () => this.cleanupRun(validRunName);
                  term.onExit(cleanup);

                  // Create a dummy log writer for compatibility
                  const logWriter = {
                    write: () => {}, // No-op for detached processes
                    close: () => {},
                  };

                  // Store all resources for this run
                  const resources: RunResources = {
                    pty: term,
                    logStream: {
                      write: logWriter.write,
                      close: logWriter.close,
                    },
                    bytesWritten: 0, // Will be tracked by logWriter
                    logFile,
                  };
                  this.resources.set(validRunName, resources);

                  // Return immediately - detached process runs independently
                  return { term, pid, logFile };
                },
                catch: (error) =>
                  ProcessRunnerErrorValue(
                    `Failed to spawn process: ${error instanceof Error ? error.message : String(error)}`,
                  ),
              }),
              DEFAULT_TIMEOUTS.PROCESS_SPAWN,
              `Process spawn timed out for run ${validRunName}`,
            ),
          ).pipe(
            Effect.flatMap(({ pid, logFile }) => {
              const runInfo: ProcessRunInfo = {
                runName: validRunName,
                pid,
                command: validCommand,
                logFile,
              };
              return Effect.map(
                this.modifyRuns((runs) => {
                  const filtered = runs.filter(
                    (run) => run.runName !== validRunName,
                  );
                  filtered.push(runInfo);
                  return filtered;
                }),
                () => runInfo,
              );
            }),
          ),
        ),
    );
  }

  attachRun(
    runName: string,
    options: { lines?: number; search?: string } = {},
  ): Effect.Effect<boolean, ProcessRunnerError> {
    return Effect.flatMap(
      validateRunName(runName),
      (validRunName) =>
        Effect.flatMap(this.readRuns(), (runs) => {
          const run = this.findLatestRunEntry(
            runs,
            validRunName,
          );
          if (!run) {
            return Effect.fail(
              ProcessRunnerErrorValue(`Run ${validRunName} not found`),
            );
          }

          return Effect.flatMap(
            this.isProcessRunning(run.pid, run.command),
            (isRunning) => {
              if (!isRunning) {
                return this.handleCompletedRun(
                  validRunName,
                  run,
                  options,
                ).pipe(Effect.as(false));
              }

              return Effect.async<boolean, ProcessRunnerError>((resume) => {
                this.attachToRun(
                  validRunName,
                  run,
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

  private async attachToRun(
    runName: string,
    run: ProcessRunInfo,
    options: { lines?: number; search?: string },
    resume: (effect: Effect.Effect<boolean, ProcessRunnerError>) => void,
  ): Promise<void> {
    try {
      await this.displayLogSnapshot(run, options);

      // Try to use existing PTY from resources first
      const existingResources = this.resources.get(runName);
      if (existingResources) {
        this.attachToPty(runName, resume);
        return;
      }

      // Since PTY is not available in current instance, we'll stream the log file
      // and provide a message to the user
      await Effect.runPromise(
        Console.log(`Attaching to run: ${runName} (Ctrl+C to detach)`),
      );
      await Effect.runPromise(
        Console.log(`Following log output from: ${run.logFile}`),
      );
      await Effect.runPromise(Console.log(`Original PID: ${run.pid}`));
      await Effect.runPromise(
        Console.log(
          "Note: You can see live output but cannot send input to the original process.",
        ),
      );
      await Effect.runPromise(
        Console.log(
          "To fully interact with the run, restart it or use a different terminal multiplexer.\n",
        ),
      );

      let position = await fs
        .stat(run.logFile)
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
          const handle = await fs.open(run.logFile, "r");
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
          await Effect.runPromise(
            Console.warn(
              `Failed to read live log updates for ${runName}: ${error instanceof Error ? error.message : String(error)}`,
            ),
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
        run.logFile,
        { persistent: true },
        () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          readNewContent();
        },
      );

      watcher.on("error", async (error) => {
        if (!watcherClosed) {
          await Effect.runPromise(
            Console.warn(
              `File watcher error for ${runName}: ${error instanceof Error ? error.message : String(error)}`,
            ),
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
      detachHandler = async () => {
        if (!isExiting) {
          isExiting = true;
          await Effect.runPromise(Console.log("\nDetaching from run..."));
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
            `Failed to attach to run: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ),
      );
    }
  }

  private cleanupRun(runName: string): void {
    const resources = this.resources.get(runName);
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
        this.resources.delete(runName);
      } catch (error) {
        // Log cleanup errors but don't throw
        Effect.runSync(
          Console.warn(`Failed to cleanup run ${runName}:`, error),
        );
      }
    }
  }

  private attachToPty(
    runName: string,
    resume: (effect: Effect.Effect<boolean, ProcessRunnerError>) => void,
  ) {
    const resources = this.resources.get(runName);
    if (!resources) {
      resume(
        Effect.fail(
          ProcessRunnerErrorValue(`PTY for run ${runName} not found`),
        ),
      );
      return;
    }

    const { pty: term } = resources;

    Effect.runSync(Console.log(`🔗 Connected to run: ${runName}`));
    Effect.runSync(
      Console.log("💡 Press Ctrl+C to detach (run will continue running)"),
    );
    Effect.runSync(Console.log("💡 Type 'exit' to end the run"));
    Effect.runSync(Console.log(`${"─".repeat(60)}\n`));

    // Set up raw mode for proper terminal interaction
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Connect PTY to stdio
    const dataHandler = (data: string | Buffer) => process.stdout.write(data);
    term.onData(dataHandler);

    let detached = false;

    const inputHandler = (data: Buffer) => {
      if (detached) return;

      // Check for Ctrl+C (0x03)
      if (data.length === 1 && data[0] === 3) {
        // Detach from run immediately
        detached = true;
        cleanup();
        resume(Effect.succeed(false)); // false indicates detach, not run end
        return;
      }
      term.write(data.toString());
    };

    process.stdin.on("data", inputHandler);

    const cleanup = () => {
      if (detached) {
        return;
      } // Prevent multiple cleanup calls

      // Restore terminal settings first
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeListener("data", inputHandler);

      // Remove signal handlers to prevent double-firing
      process.removeListener("SIGINT", interruptHandler);
      process.removeListener("SIGTERM", interruptHandler);

      Effect.runSync(Console.log(`\n${"─".repeat(60)}`));
      Effect.runSync(Console.log(`📤 Detached from run: ${runName}`));
    };

    // Handle run exit
    const exitHandler = ({ exitCode }: { exitCode?: number }) => {
      if (detached) return;
      detached = true;
      cleanup();
      resume(
        exitCode === 0
          ? Effect.succeed(true)
          : Effect.fail(
              ProcessRunnerErrorValue(
                `Run exited with code ${exitCode}`,
                exitCode ?? undefined,
              ),
            ),
      );
    };

    term.onExit(exitHandler);

    // Handle process interruption - immediate detachment
    const interruptHandler = () => {
      if (detached) return;
      detached = true;
      cleanup();
      resume(Effect.succeed(false));
    };

    // Use regular listeners instead of once to ensure they fire
    process.on("SIGINT", interruptHandler);
    process.on("SIGTERM", interruptHandler);
  }

  listRuns(): Effect.Effect<ProcessRunInfo[], ProcessRunnerError> {
    return this.readRuns();
  }

  killRun(runName: string): Effect.Effect<void, ProcessRunnerError> {
    return Effect.flatMap(
      validateRunName(runName),
      (validRunName) =>
        Effect.flatMap(
          this.modifyRuns((runs) => {
            const run = this.findLatestRunEntry(
              runs,
              validRunName,
            );
            if (!run) {
              throw new Error(`Run ${validRunName} not found`);
            }

            const resources = this.resources.get(validRunName);
            if (resources) {
              // Kill the PTY process
              resources.pty.kill("SIGTERM");

              // Schedule cleanup after a short delay to allow PTY to exit gracefully
              resources.cleanupTimeout = setTimeout(() => {
                this.cleanupRun(validRunName);
              }, 1000);
            } else {
              // Fallback: try to kill by PID if PTY not found
              try {
                process.kill(run.pid, "SIGTERM");
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
                    `Failed to kill process ${run.pid}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }
            }

            // Filter out the killed run
            return runs.filter((s) => s.runName !== validRunName);
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
    run: ProcessRunInfo,
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
      .readFile(run.logFile, "utf-8")
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

  private handleCompletedRun(
    runName: string,
    run: ProcessRunInfo,
    options: { lines?: number; search?: string },
  ): Effect.Effect<void, ProcessRunnerError> {
    return Effect.tryPromise({
      try: async () => {
        await Effect.runPromise(
          Console.log(
            `Run ${runName} is not running (last PID ${run.pid}).`,
          ),
        );
        await Effect.runPromise(Console.log(`Command was: ${run.command}`));

        const logExists = await fs
          .access(run.logFile)
          .then(() => true)
          .catch(() => false);

        if (!logExists) {
          await Effect.runPromise(
            Console.log("No log output is available for this run."),
          );
          await Effect.runPromise(
            Console.log(
              "The run may have failed to start or exited immediately.",
            ),
          );
          return;
        }

        await this.displayLogSnapshot(run, options, [
          "cat",
          run.logFile,
        ]);

        await Effect.runPromise(Console.log("\n--- end of run log ---\n"));
      },
      catch: (error) =>
        ProcessRunnerErrorValue(
          `Failed to read run logs: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  private dedupeRuns(runs: ProcessRunInfo[]): ProcessRunInfo[] {
    const seen = new Set<string>();
    const deduped: ProcessRunInfo[] = [];

    for (let index = runs.length - 1; index >= 0; index--) {
      const run = runs[index];
      if (!seen.has(run.runName)) {
        seen.add(run.runName);
        deduped.unshift(run);
      }
    }

    return deduped;
  }

  private findLatestRunEntry(
    runs: ProcessRunInfo[],
    runName: string,
  ): ProcessRunInfo | undefined {
    for (let index = runs.length - 1; index >= 0; index--) {
      const run = runs[index];
      if (run.runName === runName) {
        return run;
      }
    }
    return undefined;
  }
}
