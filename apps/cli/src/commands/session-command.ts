import { Args, Command, Options } from "@effect/cli";
import { ProcessRunnerService } from "@open-composer/process-runner";
import { Effect } from "effect";
import type { CommandBuilder } from "../types/commands";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildSessionCommand = (): CommandBuilder<"session"> => ({
  command: () => Command.make("session").pipe(
    Command.withDescription("Manage persistent process sessions"),
    Command.withSubcommands([
      buildAttachSubcommand(),
      buildKillSubcommand(),
      buildListSubcommand(),
      buildSpawnSubcommand(),
    ]),
    ),
  metadata: {
    name: "session",
    description: "Manage persistent process sessions",
  },
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildAttachSubcommand() {
  const sessionNameArg = Args.text({ name: "session-name" }).pipe(
    Args.withDescription("Name of the session to attach to"),
  );
  const linesOption = Options.integer("lines").pipe(
    Options.optional,
    Options.withDescription(
      "Number of lines to display from log history before live output",
    ),
  );
  const searchOption = Options.text("search").pipe(
    Options.optional,
    Options.withDescription(
      "Search pattern to filter log output before live output",
    ),
  );

  return Command.make("attach", {
    sessionName: sessionNameArg,
    lines: linesOption,
    search: searchOption,
  }).pipe(
    Command.withDescription("Attach to a persistent session with live stdio"),
    Command.withHandler(({ sessionName, lines, search }) =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        const attached = yield* runnerService.attachSession(sessionName, {
          lines: lines._tag === "Some" ? lines.value : undefined,
          search: search._tag === "Some" ? search.value : undefined,
        });
        if (attached) {
          console.log(`Attached to session: ${sessionName} (Ctrl+C to detach)`);
        } else {
          console.log(
            `Session ${sessionName} has already finished. Displayed stored log output.`,
          );
        }
      }),
    ),
  );
}

function buildKillSubcommand() {
  const sessionNameArg = Args.text({ name: "session-name" }).pipe(
    Args.withDescription("Name of the session to kill"),
  );

  return Command.make("kill", {
    sessionName: sessionNameArg,
  }).pipe(
    Command.withDescription("Kill a persistent session"),
    Command.withHandler(({ sessionName }) =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        yield* runnerService.killSession(sessionName);
        console.log(`Killed session: ${sessionName}`);
      }),
    ),
  );
}

function buildListSubcommand() {
  return Command.make("list").pipe(
    Command.withDescription("List all persistent sessions"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        const sessions = yield* runnerService.listSessions();

        if (sessions.length === 0) {
          console.log("No active sessions found.");
          return;
        }

        console.log("Active sessions:");
        console.log("----------------");
        sessions.forEach((session) => {
          console.log(`- ${session.sessionName} (PID: ${session.pid})`);
          console.log(`  Command: ${session.command}`);
          console.log(`  Log file: ${session.logFile}`);
          console.log();
        });
      }),
    ),
  );
}

function buildSpawnSubcommand() {
  const sessionNameArg = Args.text({ name: "session-name" }).pipe(
    Args.withDescription("Name for the process session"),
  );
  const commandArg = Args.text({ name: "command" }).pipe(
    Args.withDescription("Command to run in the session"),
  );
  const logDirOption = Options.text("log-dir").pipe(
    Options.optional,
    Options.withDescription("Directory for log files (default: /tmp)"),
  );

  return Command.make("spawn", {
    sessionName: sessionNameArg,
    command: commandArg,
    logDir: logDirOption,
  }).pipe(
    Command.withDescription(
      "Spawn a persistent process session with live stdio",
    ),
    Command.withHandler(({ sessionName, command, logDir }) =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make({
          logDir: logDir._tag === "Some" ? logDir.value : undefined,
        });

        // Spawn the session and immediately detach
        const sessionInfo = yield* runnerService.newSession(
          sessionName,
          command,
        );

        console.log(`✅ Spawned session: ${sessionName}`);
        console.log(`📋 Command: ${command}`);
        console.log(`🆔 PID: ${sessionInfo.pid}`);
        console.log(`📄 Log file: ${sessionInfo.logFile}`);
        console.log(`\nTo attach: open-composer session attach ${sessionName}`);
        console.log(`To kill: open-composer session kill ${sessionName}`);

        // Check if we're in test mode to avoid interactive prompts
        const isTestMode =
          process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1";

        // In test mode, skip auto-attachment to avoid hanging
        if (isTestMode) {
          return;
        }

        // Default behavior: automatically attach to all sessions
        console.log("\n🔄 Automatically attaching to session...\n");

        // Brief delay for session initialization
        yield* Effect.sleep(100);

        // Always attach to the session we just created
        // This will provide true interactivity since the PTY resources are still alive
        const attachResult = yield* runnerService.attachSession(
          sessionName,
          {},
        );

        if (attachResult) {
          console.log("\nSession ended.");

          // Ensure terminal is properly restored after session end
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }

          // In test mode, just exit without interactive menu
          if (isTestMode) {
            return;
          }

          // Provide options after session completion, similar to detachment
          yield* Effect.async<void, never>((resume) => {
            console.log(`\n${"=".repeat(60)}`);
            console.log("🎛️  Session completed - Choose an action:");
            console.log("  [s] Start a new session");
            console.log("  [l] List all sessions");
            console.log("  [q] Quit to terminal");
            console.log("=".repeat(60));

            const readline = require("node:readline");
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const handleCompletionInput = (answer: string) => {
              const choice = answer.trim().toLowerCase();
              switch (choice) {
                case "s":
                  rl.close();
                  console.log(
                    '\nTo start a new session, use: open-composer session spawn <name> "<command>"',
                  );
                  resume(Effect.succeed(void 0));
                  break;
                case "l":
                  // List sessions
                  runnerService
                    .listSessions()
                    .pipe(Effect.runPromise)
                    .then((sessions) => {
                      console.log("\nActive sessions:");
                      console.log("----------------");
                      sessions.forEach((session) => {
                        console.log(
                          `- ${session.sessionName} (PID: ${session.pid})`,
                        );
                        console.log(`  Command: ${session.command}`);
                        console.log(`  Log file: ${session.logFile}\n`);
                      });
                      rl.question(
                        "Choose action [s/l/q]: ",
                        handleCompletionInput,
                      );
                    })
                    .catch(() => {
                      rl.question(
                        "Choose action [s/l/q]: ",
                        handleCompletionInput,
                      );
                    });
                  break;
                default:
                  rl.close();
                  resume(Effect.succeed(void 0));
                  break;
              }
            };

            rl.question("Choose action [s/l/q]: ", handleCompletionInput);
          });
        } else {
          console.log(
            "\nDetached from session. Session continues running in background.",
          );
          console.log(
            `To re-attach: open-composer session attach ${sessionName}`,
          );
          console.log(`To kill: open-composer session kill ${sessionName}`);

          // In test mode, just exit without interactive menu
          if (isTestMode) {
            return;
          }

          // Keep the process alive and provide options
          yield* Effect.async<void, never>((resume) => {
            console.log(`\n${"=".repeat(60)}`);
            console.log("🎛️  Session Manager - Choose an action:");
            console.log("  [a] Attach to this session again");
            console.log("  [k] Kill this session");
            console.log("  [l] List all sessions");
            console.log("  [q] Quit to terminal");
            console.log("=".repeat(60));

            const readline = require("node:readline");
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const handleInput = (answer: string) => {
              const choice = answer.trim().toLowerCase();
              switch (choice) {
                case "a":
                  rl.close();
                  // Re-attach to the session
                  runnerService
                    .attachSession(sessionName, {})
                    .pipe(Effect.runPromise)
                    .then(() => {
                      resume(Effect.succeed(void 0));
                    })
                    .catch(() => {
                      resume(Effect.succeed(void 0));
                    });
                  break;
                case "k":
                  rl.close();
                  runnerService
                    .killSession(sessionName)
                    .pipe(Effect.runPromise)
                    .then(() => {
                      console.log(`Session ${sessionName} killed.`);
                      resume(Effect.succeed(void 0));
                    })
                    .catch(() => {
                      resume(Effect.succeed(void 0));
                    });
                  break;
                case "l":
                  runnerService
                    .listSessions()
                    .pipe(Effect.runPromise)
                    .then((sessions) => {
                      console.log("\nActive sessions:");
                      console.log("----------------");
                      sessions.forEach((session) => {
                        console.log(
                          `- ${session.sessionName} (PID: ${session.pid})`,
                        );
                        console.log(`  Command: ${session.command}`);
                        console.log(`  Log file: ${session.logFile}\n`);
                      });
                      rl.question("Choose action [a/k/l/q]: ", handleInput);
                    })
                    .catch(() => {
                      rl.question("Choose action [a/k/l/q]: ", handleInput);
                    });
                  break;
                default:
                  rl.close();
                  resume(Effect.succeed(void 0));
                  break;
              }
            };

            rl.question("Choose action [a/k/l/q]: ", handleInput);
          });
        }
      }),
    ),
  );
}
