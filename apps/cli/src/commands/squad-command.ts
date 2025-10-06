import { Args, Command, Options } from "@effect/cli";
import {
  getAgentRegistry,
  getSquadLauncher,
  LLMTask,
} from "@open-composer/agent-registry";
import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Option from "effect/Option";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";
import { PokemonUI } from "../utils/pokemon-ui.js";
import { startSquadSelector } from "../utils/squad-selector.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildSquadCommand(): CommandBuilder<"squad"> {
  const command = () =>
    Command.make("squad").pipe(
      Command.withDescription(
        "Launch custom agent squads with Pokemon-style configuration (defaults to interactive mode)",
      ),
      Command.withHandler(() =>
        Effect.gen(function* () {
          yield* trackCommand("squad:interactive");
          yield* trackFeatureUsage("squad", { feature: "interactive" });

          yield* Effect.promise(() => startSquadSelector());

          yield* Console.log("Interactive mode ended");
        }),
      ),
      Command.withSubcommands([
        buildInteractiveCommand(),
        buildQuickCommand(),
        buildListAgentsCommand(),
        buildListSquadsCommand(),
        buildShowCommand(),
        buildCompareCommand(),
        buildStatsCommand(),
        buildLaunchCommand(),
      ]),
    );

  return {
    command,
    metadata: {
      name: "squad",
      description: "Launch custom agent squads with Pokemon-style configuration (defaults to interactive mode)",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildInteractiveCommand() {
  return Command.make("interactive").pipe(
    Command.withDescription("Start interactive squad manager (Pokemon-style UI)"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("squad:interactive");
        yield* trackFeatureUsage("squad", { feature: "interactive" });

        yield* Effect.promise(() => startSquadSelector());

        yield* Console.log("Interactive mode ended");
      }),
    ),
  );
}

function buildQuickCommand() {
  const taskArg = Args.text({ name: "task" }).pipe(
    Args.withDescription("Task type (planner, programmer, reviewer, router, summarizer)"),
  );

  const nameOption = Options.text("name").pipe(
    Options.withAlias("n"),
    Options.withDescription("Squad name"),
    Options.optional,
  );

  const launchOption = Options.boolean("launch").pipe(
    Options.withAlias("l"),
    Options.withDescription("Launch squad immediately after creation"),
    Options.withDefault(false),
  );

  return Command.make("quick", { task: taskArg, name: nameOption, launch: launchOption }).pipe(
    Command.withDescription("Quickly create a squad for a specific task"),
    Command.withHandler(({ task, name, launch }) =>
      Effect.gen(function* () {
        yield* trackCommand("squad:quick");
        yield* trackFeatureUsage("squad", { feature: "quick_create" });

        const launcher = getSquadLauncher();
        const squadName = Option.getOrUndefined(name);

        try {
          const team = launcher.createQuickSquad(
            task as LLMTask,
            squadName,
          );

          yield* Console.log("\n✅ Squad created successfully!\n");
          yield* Console.log(PokemonUI.renderTeam(team));

          if (launch) {
            yield* Console.log("\n🚀 Launching squad...\n");
            const results = yield* Effect.promise(() =>
              launcher.launchSquad(team.id, {
                task: task as LLMTask,
                priority: 1,
              }),
            );

            yield* Console.log("\n✅ Squad execution complete!\n");
            for (const result of results) {
              const status = result.success ? "✅" : "❌";
              yield* Console.log(
                `  ${status} ${result.agentName}: ${result.success ? "Success" : "Failed"}`,
              );
              yield* Console.log(
                `     Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`,
              );
            }
          }
        } catch (error) {
          yield* Console.error(
            "\n❌ Error:",
            error instanceof Error ? error.message : error,
          );
          return yield* Effect.fail(error);
        }
      }),
    ),
  );
}

function buildListAgentsCommand() {
  const tierOption = Options.text("tier").pipe(
    Options.withAlias("t"),
    Options.withDescription("Filter by tier (starter, evolved, legendary)"),
    Options.optional,
  );

  const providerOption = Options.text("provider").pipe(
    Options.withAlias("p"),
    Options.withDescription("Filter by provider (anthropic, openai, google-genai)"),
    Options.optional,
  );

  const taskOption = Options.text("task").pipe(
    Options.withAlias("k"),
    Options.withDescription("Filter by task specialization"),
    Options.optional,
  );

  return Command.make("list-agents", {
    tier: tierOption,
    provider: providerOption,
    task: taskOption,
  }).pipe(
    Command.withDescription("List all available agents"),
    Command.withHandler(({ tier, provider, task }) =>
      Effect.gen(function* () {
        yield* trackCommand("squad:list-agents");

        const registry = getAgentRegistry();
        let agents = registry.getAllAgents();

        const tierValue = Option.getOrUndefined(tier);
        const providerValue = Option.getOrUndefined(provider);
        const taskValue = Option.getOrUndefined(task);

        if (tierValue) {
          agents = registry.getAgentsByTier(tierValue as any);
        }

        if (providerValue) {
          agents = registry.getAgentsByProvider(providerValue as any);
        }

        if (taskValue) {
          agents = registry.getAgentsByTask(taskValue as LLMTask);
        }

        yield* Console.log(PokemonUI.renderAgentList(agents));
      }),
    ),
  );
}

function buildListSquadsCommand() {
  return Command.make("list-squads").pipe(
    Command.withDescription("List all created squads"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("squad:list-squads");

        const registry = getAgentRegistry();
        const teams = registry.getAllTeams();

        if (teams.length === 0) {
          yield* Console.log("\n⚠️  No squads available.\n");
          return;
        }

        yield* Console.log("\n=== Available Squads ===\n");
        for (const team of teams) {
          yield* Console.log(PokemonUI.renderTeam(team));
        }
      }),
    ),
  );
}

function buildShowCommand() {
  const agentIdArg = Args.text({ name: "agentId" }).pipe(
    Args.withDescription("Agent ID to show details for"),
  );

  return Command.make("show", { agentId: agentIdArg }).pipe(
    Command.withDescription("Show detailed information about an agent"),
    Command.withHandler(({ agentId }) =>
      Effect.gen(function* () {
        yield* trackCommand("squad:show");

        const registry = getAgentRegistry();
        const agent = registry.getAgent(agentId);

        if (!agent) {
          yield* Console.error(`\n❌ Agent ${agentId} not found\n`);
          return yield* Effect.fail(new Error(`Agent ${agentId} not found`));
        }

        yield* Console.log(PokemonUI.renderAgentCard(agent));
        yield* Console.log(PokemonUI.renderTaskSpecializations(agent));
        yield* Console.log(PokemonUI.renderEvolutionTree(agent));
      }),
    ),
  );
}

function buildCompareCommand() {
  const agent1Arg = Args.text({ name: "agent1Id" }).pipe(
    Args.withDescription("First agent ID"),
  );

  const agent2Arg = Args.text({ name: "agent2Id" }).pipe(
    Args.withDescription("Second agent ID"),
  );

  return Command.make("compare", { agent1Id: agent1Arg, agent2Id: agent2Arg }).pipe(
    Command.withDescription("Compare two agents"),
    Command.withHandler(({ agent1Id, agent2Id }) =>
      Effect.gen(function* () {
        yield* trackCommand("squad:compare");

        const registry = getAgentRegistry();
        const agent1 = registry.getAgent(agent1Id);
        const agent2 = registry.getAgent(agent2Id);

        if (!agent1) {
          yield* Console.error(`\n❌ Agent ${agent1Id} not found\n`);
          return yield* Effect.fail(new Error(`Agent ${agent1Id} not found`));
        }

        if (!agent2) {
          yield* Console.error(`\n❌ Agent ${agent2Id} not found\n`);
          return yield* Effect.fail(new Error(`Agent ${agent2Id} not found`));
        }

        yield* Console.log(PokemonUI.renderComparison(agent1, agent2));
      }),
    ),
  );
}

function buildStatsCommand() {
  return Command.make("stats").pipe(
    Command.withDescription("Show registry statistics"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("squad:stats");

        const registry = getAgentRegistry();
        const stats = registry.getStats();
        yield* Console.log(PokemonUI.renderStats(stats));
      }),
    ),
  );
}

function buildLaunchCommand() {
  const squadIdArg = Args.text({ name: "squadId" }).pipe(
    Args.withDescription("Squad ID to launch"),
  );

  const taskArg = Args.text({ name: "task" }).pipe(
    Args.withDescription("Task type to execute"),
  );

  return Command.make("launch", { squadId: squadIdArg, task: taskArg }).pipe(
    Command.withDescription("Launch an existing squad for a task"),
    Command.withHandler(({ squadId, task }) =>
      Effect.gen(function* () {
        yield* trackCommand("squad:launch");
        yield* trackFeatureUsage("squad", { feature: "launch" });

        const launcher = getSquadLauncher();

        try {
          yield* Console.log("\n🚀 Launching squad...\n");

          const results = yield* Effect.promise(() =>
            launcher.launchSquad(squadId, {
              task: task as LLMTask,
              priority: 1,
            }),
          );

          yield* Console.log("\n✅ Squad execution complete!\n");
          yield* Console.log("Results:");

          for (const result of results) {
            const statusIcon = result.success ? "✅" : "❌";
            const status = result.success ? "Success" : "Failed";

            yield* Console.log(`  ${statusIcon} ${result.agentName}: ${status}`);
            yield* Console.log(
              `     Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`,
            );

            if (result.error) {
              yield* Console.error(`     Error: ${result.error}`);
            }
          }
        } catch (error) {
          yield* Console.error(
            "\n❌ Error:",
            error instanceof Error ? error.message : error,
          );
          return yield* Effect.fail(error);
        }
      }),
    ),
  );
}
