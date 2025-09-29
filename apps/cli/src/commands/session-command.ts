import { Args, Command, Options } from "@effect/cli";
import { ProcessRunnerService } from "@open-composer/process-runner";
import { Effect } from "effect";

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
      }),
    ),
  );
}

export function buildSessionCommand() {
  return Command.make("session").pipe(
    Command.withDescription("Manage persistent process sessions"),
    Command.withSubcommands([
      buildAttachSubcommand(),
      buildKillSubcommand(),
      buildListSubcommand(),
      buildSpawnSubcommand(),
    ]),
  );
}
