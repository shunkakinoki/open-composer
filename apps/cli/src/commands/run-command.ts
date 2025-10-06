import { Args, Command, Options } from "@effect/cli";
import { ProcessRunnerService } from "@open-composer/process-runner";
import { Effect } from "effect";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildRunCommand = (): CommandBuilder<"run"> => ({
  command: () =>
    Command.make("run").pipe(
      Command.withDescription("Manage persistent process runs"),
      Command.withSubcommands([
        buildAttachSubcommand(),
        buildKillSubcommand(),
        buildListSubcommand(),
        buildSpawnSubcommand(),
      ]),
    ),
  metadata: {
    name: "run",
    description: "Manage persistent process runs",
  },
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildAttachSubcommand() {
  const runNameArg = Args.text({ name: "run-name" }).pipe(
    Args.withDescription("Name of the run to attach to"),
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
    runName: runNameArg,
    lines: linesOption,
    search: searchOption,
  }).pipe(
    Command.withDescription("Attach to a persistent run with live stdio"),
    Command.withHandler(({ runName, lines, search }) =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        const attachOptions: { lines?: number; search?: string } = {};
        if (lines._tag === "Some") {
          attachOptions.lines = lines.value;
        }
        if (search._tag === "Some") {
          attachOptions.search = search.value;
        }
        const attached = yield* runnerService.attachRun(
          runName,
          attachOptions,
        );
        if (attached) {
          console.log(`Attached to run: ${runName} (Ctrl+C to detach)`);
        } else {
          console.log(
            `Run ${runName} has already finished. Displayed stored log output.`,
          );
        }
      }),
    ),
  );
}

function buildKillSubcommand() {
  const runNameArg = Args.text({ name: "run-name" }).pipe(
    Args.withDescription("Name of the run to kill"),
  );

  return Command.make("kill", {
    runName: runNameArg,
  }).pipe(
    Command.withDescription("Kill a persistent run"),
    Command.withHandler(({ runName }) =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        yield* runnerService.killRun(runName);
        console.log(`Killed run: ${runName}`);
      }),
    ),
  );
}

function buildListSubcommand() {
  return Command.make("list").pipe(
    Command.withDescription("List all persistent runs"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const runnerService = yield* ProcessRunnerService.make();
        const runs = yield* runnerService.listRuns();

        if (runs.length === 0) {
          console.log("No active runs found.");
          return;
        }

        console.log("Active runs:");
        console.log("----------------");
        runs.forEach((run) => {
          console.log(`- ${run.runName} (PID: ${run.pid})`);
          console.log(`  Command: ${run.command}`);
          console.log(`  Log file: ${run.logFile}`);
          console.log();
        });
      }),
    ),
  );
}

function buildSpawnSubcommand() {
  const runNameArg = Args.text({ name: "run-name" }).pipe(
    Args.withDescription("Name for the process run"),
  );
  const commandArg = Args.text({ name: "command" }).pipe(
    Args.withDescription("Command to run in the run"),
  );
  const logDirOption = Options.text("log-dir").pipe(
    Options.optional,
    Options.withDescription("Directory for log files (default: /tmp)"),
  );

  return Command.make("spawn", {
    runName: runNameArg,
    command: commandArg,
    logDir: logDirOption,
  }).pipe(
    Command.withDescription(
      "Spawn a persistent process run with live stdio",
    ),
    Command.withHandler(({ runName, command, logDir }) =>
      Effect.gen(function* () {
        const runnerOptions: { logDir?: string } = {};
        if (logDir._tag === "Some") {
          runnerOptions.logDir = logDir.value;
        }
        const runnerService = yield* ProcessRunnerService.make(runnerOptions);

        // Spawn the run and immediately detach
        const runInfo = yield* runnerService.newRun(
          runName,
          command,
        );

        console.log(`✅ Spawned run: ${runName}`);
        console.log(`📋 Command: ${command}`);
        console.log(`🆔 PID: ${runInfo.pid}`);
        console.log(`📄 Log file: ${runInfo.logFile}`);
        console.log(`\nTo attach: open-composer run attach ${runName}`);
        console.log(`To kill: open-composer run kill ${runName}`);

        // Check if we're in test mode to avoid interactive prompts
        const isTestMode =
          process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1";

        // In test mode, skip auto-attachment to avoid hanging
        if (isTestMode) {
          return;
        }

        // Default behavior: automatically attach to all runs
        console.log("\n🔄 Automatically attaching to run...\n");

        // Brief delay for run initialization
        yield* Effect.sleep(100);

        // Always attach to the run we just created
        // This will provide true interactivity since the PTY resources are still alive
        const attachResult = yield* runnerService.attachRun(
          runName,
          {},
        );

        if (attachResult) {
          console.log("\nRun ended.");

          // Ensure terminal is properly restored after run end
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }

          // In test mode, just exit without interactive menu
          if (isTestMode) {
            return;
          }

          // Provide options after run completion, similar to detachment
          yield* Effect.async<void, never>((resume) => {
            console.log(`\n${"=".repeat(60)}`);
            console.log("🎛️  Run completed - Choose an action:");
            console.log("  [s] Start a new run");
            console.log("  [l] List all runs");
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
                    '\nTo start a new run, use: open-composer run spawn <name> "<command>"',
                  );
                  resume(Effect.succeed(void 0));
                  break;
                case "l":
                  // List runs
                  runnerService
                    .listRuns()
                    .pipe(Effect.runPromise)
                    .then((runs) => {
                      console.log("\nActive runs:");
                      console.log("----------------");
                      runs.forEach((run) => {
                        console.log(
                          `- ${run.runName} (PID: ${run.pid})`,
                        );
                        console.log(`  Command: ${run.command}`);
                        console.log(`  Log file: ${run.logFile}\n`);
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
            "\nDetached from run. Run continues running in background.",
          );
          console.log(
            `To re-attach: open-composer run attach ${runName}`,
          );
          console.log(`To kill: open-composer run kill ${runName}`);

          // In test mode, just exit without interactive menu
          if (isTestMode) {
            return;
          }

          // Keep the process alive and provide options
          yield* Effect.async<void, never>((resume) => {
            console.log(`\n${"=".repeat(60)}`);
            console.log("🎛️  Run Manager - Choose an action:");
            console.log("  [a] Attach to this run again");
            console.log("  [k] Kill this run");
            console.log("  [l] List all runs");
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
                  // Re-attach to the run
                  runnerService
                    .attachRun(runName, {})
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
                    .killRun(runName)
                    .pipe(Effect.runPromise)
                    .then(() => {
                      console.log(`Run ${runName} killed.`);
                      resume(Effect.succeed(void 0));
                    })
                    .catch(() => {
                      resume(Effect.succeed(void 0));
                    });
                  break;
                case "l":
                  runnerService
                    .listRuns()
                    .pipe(Effect.runPromise)
                    .then((runs) => {
                      console.log("\nActive runs:");
                      console.log("----------------");
                      runs.forEach((run) => {
                        console.log(
                          `- ${run.runName} (PID: ${run.pid})`,
                        );
                        console.log(`  Command: ${run.command}`);
                        console.log(`  Log file: ${run.logFile}\n`);
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
