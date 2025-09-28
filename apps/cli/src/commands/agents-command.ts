import { Args, Command, Options } from "@effect/cli";
import { refreshAgentCache } from "@open-composer/agent-router";
import { type AgentCache, updateAgentCache } from "@open-composer/config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AgentService } from "../services/agent-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";

export function buildAgentsCommand() {
  return Command.make("agents").pipe(
    Command.withDescription("Manage AI agents"),
    Command.withSubcommands([
      buildListCommand(),
      buildActivateCommand(),
      buildDeactivateCommand(),
      buildRefreshCommand(),
      buildRouteCommand(),
    ]),
  );
}

export function buildListCommand() {
  const activeOnlyOption = Options.boolean("active").pipe(
    Options.withDescription("Only show active agents"),
  );

  return Command.make("list", { activeOnly: activeOnlyOption }).pipe(
    Command.withDescription("List available agents"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("agents", "list");
        yield* trackFeatureUsage("agent_list", {
          active_only: config.activeOnly,
        });

        const cli = yield* AgentService.make();
        yield* cli.list({ activeOnly: config.activeOnly });
      }),
    ),
  );
}

export function buildActivateCommand() {
  const agentArg = Args.text({ name: "agent" }).pipe(
    Args.withDescription("Agent name to activate"),
  );

  return Command.make("activate", { agent: agentArg }).pipe(
    Command.withDescription("Activate an agent"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("agents", "activate");
        yield* trackFeatureUsage("agent_activate", {
          agent: config.agent,
        });

        const cli = yield* AgentService.make();
        yield* cli.activate(config.agent);
      }),
    ),
  );
}

export function buildDeactivateCommand() {
  const agentArg = Args.text({ name: "agent" }).pipe(
    Args.withDescription("Agent name to deactivate"),
  );

  return Command.make("deactivate", { agent: agentArg }).pipe(
    Command.withDescription("Deactivate an agent"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("agents", "deactivate");
        yield* trackFeatureUsage("agent_deactivate", {
          agent: config.agent,
        });

        const cli = yield* AgentService.make();
        yield* cli.deactivate(config.agent);
      }),
    ),
  );
}

export function buildRefreshCommand() {
  return Command.make("refresh").pipe(
    Command.withDescription("Refresh agent availability cache"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("agents", "refresh");
        yield* trackFeatureUsage("agent_refresh", {});

        yield* Effect.sync(() => {
          console.log("Refreshing agent availability cache...");
        });

        const agents = yield* refreshAgentCache();

        // Update cache with fresh results
        const cacheData: AgentCache = {
          agents: agents.map((agent) => ({
            name: agent.definition.name,
            available: true, // All returned agents are available
            lastChecked: new Date().toISOString(),
          })),
          lastUpdated: new Date().toISOString(),
        };

        yield* updateAgentCache(cacheData);

        yield* Effect.sync(() => {
          console.log(`Found ${agents.length} available agents:`);
          agents.forEach((agent) => {
            console.log(
              `  - ${agent.definition.name}: ${agent.definition.role}`,
            );
          });
          console.log("Agent cache refreshed successfully.");
        });
      }),
    ),
  );
}

export function buildRouteCommand() {
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
        yield* trackCommand("agents", "route");
        yield* trackFeatureUsage("agent_route", {
          has_path: Option.isSome(config.path),
          has_agent: Option.isSome(config.agent),
          query_length: config.query.length,
        });

        const cli = yield* AgentService.make();
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
