import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AgentCli } from "../services/agent-cli.js";

export function buildAgentsCommand() {
  return Command.make("agents").pipe(
    Command.withDescription("Manage AI agents"),
    Command.withSubcommands([
      buildListCommand(),
      buildActivateCommand(),
      buildDeactivateCommand(),
      buildRouteCommand(),
    ]),
  );
}

function buildListCommand() {
  const activeOnlyOption = Options.boolean("active").pipe(
    Options.withDescription("Only show active agents"),
  );

  return Command.make("list", { activeOnly: activeOnlyOption }).pipe(
    Command.withDescription("List available agents"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* AgentCli.make();
        yield* cli.list({ activeOnly: config.activeOnly });
      }),
    ),
  );
}

function buildActivateCommand() {
  const agentArg = Args.text({ name: "agent" }).pipe(
    Args.withDescription("Agent name to activate"),
  );

  return Command.make("activate", { agent: agentArg }).pipe(
    Command.withDescription("Activate an agent"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* AgentCli.make();
        yield* cli.activate(config.agent);
      }),
    ),
  );
}

function buildDeactivateCommand() {
  const agentArg = Args.text({ name: "agent" }).pipe(
    Args.withDescription("Agent name to deactivate"),
  );

  return Command.make("deactivate", { agent: agentArg }).pipe(
    Command.withDescription("Deactivate an agent"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* AgentCli.make();
        yield* cli.deactivate(config.agent);
      }),
    ),
  );
}

function buildRouteCommand() {
  const queryArg = Args.text({ name: "query" }).pipe(
    Args.withDescription("The request to send to the router"),
  );

  const cliPathOption = Options.text("path").pipe(
    Options.optional,
    Options.withDescription("Comma-separated CLI path segments"),
  );

  const agentOption = Options.text("agent").pipe(
    Options.optional,
    Options.withDescription("Explicit agent to route to"),
  );

  return Command.make("route", {
    query: queryArg,
    path: cliPathOption,
    agent: agentOption,
  }).pipe(
    Command.withDescription("Route a query through the agent router"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* AgentCli.make();
        yield* cli.route({
          query: config.query,
          cliPath: Option.getOrUndefined(
            Option.map(config.path, (path) =>
              path.split(",").map((part: string) => part.trim()),
            ),
          ),
          agent: Option.getOrUndefined(config.agent),
        });
      }),
    ),
  );
}
