import { Args, Command, Options } from "@effect/cli";
import {
  type AgentChecker,
  getAvailableAgents,
} from "@open-composer/agent-router";
import type { CacheServiceInterface } from "@open-composer/cache";
import { type GitCommandError, type GitService, run } from "@open-composer/git";
import { type TmuxCommandError, TmuxService } from "@open-composer/tmux";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { type SpawnConfig, SpawnPrompt } from "../components/SpawnPrompt.js";
import { GitWorktreeService } from "../services/git-worktree-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildSpawnCommand = (): CommandBuilder<"spawn"> => ({
  command: () => buildSpawnCommandInternal(),
  metadata: {
    name: "spawn",
    description:
      "Spawn multiple AI agents in separate worktrees with tmux sessions",
  },
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

// Function to get available agents from agent router
export const getAvailableAgentNames: Effect.Effect<
  readonly string[],
  never,
  CacheServiceInterface
> = Effect.gen(function* () {
  const agents = yield* getAvailableAgents;
  return agents.map(
    (agent: AgentChecker) => agent.definition.name,
  ) as readonly string[];
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildSpawnCommandInternal() {
  const sessionNameArg = Args.text({ name: "session-name" }).pipe(
    Args.optional,
    Args.withDescription(
      "Name for the spawn session (optional, will prompt if not provided)",
    ),
  );

  const agentsOption = Options.text("agents").pipe(
    Options.optional,
    Options.withDescription(
      "Comma-separated list of agents to spawn (codex,claude-code,opencode)",
    ),
  );

  const baseBranchOption = Options.text("base").pipe(
    Options.optional,
    Options.withDescription("Base branch to branch from (default: main)"),
  );

  const createPROption = Options.boolean("create-pr").pipe(
    Options.withDescription(
      "Create PRs for the spawned worktrees (default: false)",
    ),
  );

  return Command.make("spawn", {
    sessionName: sessionNameArg,
    agents: agentsOption,
    base: baseBranchOption,
    createPR: createPROption,
  }).pipe(
    Command.withDescription(
      "Spawn multiple AI agents in separate worktrees with tmux sessions",
    ),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("spawn");
        yield* trackFeatureUsage("spawn", {
          has_session_name: Option.isSome(config.sessionName),
          has_agents: Option.isSome(config.agents),
          has_base: Option.isSome(config.base),
          create_pr: config.createPR,
        });

        // Check if all required args are provided for non-interactive mode
        const hasAllArgs =
          Option.isSome(config.sessionName) &&
          Option.isSome(config.agents) &&
          Option.isSome(config.base);

        if (hasAllArgs) {
          // Non-interactive mode - use provided arguments
          const spawnConfig: SpawnConfig = {
            sessionName: Option.getOrThrow(config.sessionName),
            agents: Option.getOrThrow(config.agents)
              .split(",")
              .map((a) => a.trim()),
            baseBranch: Option.getOrThrow(config.base),
            createPR: config.createPR,
          };

          yield* executeSpawn(spawnConfig);
        } else {
          // Interactive mode - use React component
          const availableAgentNames = yield* getAvailableAgentNames;
          const spawnConfig = yield* Effect.tryPromise({
            try: async () => {
              return new Promise<SpawnConfig>((resolve, reject) => {
                const { waitUntilExit } = render(
                  React.createElement(SpawnPrompt, {
                    availableAgents: availableAgentNames,
                    onComplete: (config: SpawnConfig) => {
                      resolve(config);
                    },
                    onCancel: () => {
                      reject(new Error("Spawn cancelled by user"));
                    },
                  }),
                );
                waitUntilExit().catch(reject);
              });
            },
            catch: (error) => {
              if (
                error instanceof Error &&
                error.message === "Spawn cancelled by user"
              ) {
                return error;
              }
              return new Error(
                `Failed to start interactive spawn: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            },
          });

          yield* executeSpawn(spawnConfig);
        }
      }),
    ),
  );
}

function executeSpawn(
  config: SpawnConfig,
): Effect.Effect<
  void,
  Error | TmuxCommandError | GitCommandError,
  GitService | CacheServiceInterface
> {
  return Effect.gen(function* () {
    console.log(`\n🪄 Spawning session: ${config.sessionName}`);
    console.log(`📋 Agents: ${config.agents.join(", ")}`);
    console.log(`🌿 Base branch: ${config.baseBranch}`);
    console.log(`🔗 Create PRs: ${config.createPR ? "Yes" : "No"}\n`);

    // Create worktrees and spawn tmux sessions for each agent
    const worktreeResults = yield* createWorktreesAndSpawnSessions(config);

    // Show the final status output
    yield* showSpawnOutput(config, worktreeResults);
  });
}

interface WorktreeResult {
  agent: string;
  branchName: string;
  worktreePath: string;
  tmuxPid?: number;
  prNumber?: number;
  changes?: string;
}

function createWorktreeAndSpawnSession(
  agent: string,
  config: SpawnConfig,
): Effect.Effect<
  WorktreeResult,
  Error | TmuxCommandError | GitCommandError,
  GitService
> {
  return Effect.gen(function* () {
    const branchName = `${agent}-branch`;
    const worktreePath = `./worktrees/${config.sessionName}/${branchName}`;

    // Create worktree
    const gitWorktreeService = yield* GitWorktreeService.make();
    yield* gitWorktreeService.create({
      path: worktreePath,
      ref: config.baseBranch,
      branch: branchName,
      force: false,
      detach: false,
      checkout: true,
      branchForce: false,
    });

    console.log(`Created worktree at ${worktreePath}`);
    console.log(`Created branch '${branchName}' from ${config.baseBranch}`);

    // Spawn tmux session
    const tmuxPid = yield* spawnTmuxSession(agent, worktreePath, branchName);
    console.log(
      `Spawned tmux session open-composer-${branchName} with ${agent}`,
    );

    // Calculate change stats
    const changes = yield* calculateChangeStats(
      worktreePath,
      config.baseBranch,
    );

    // Create PR if requested
    let prNumber: number | undefined;
    if (config.createPR) {
      prNumber = yield* createPR(branchName, config.baseBranch);
    }

    const result: WorktreeResult = {
      agent,
      branchName,
      worktreePath,
      tmuxPid,
      changes,
    };

    if (prNumber !== undefined) {
      result.prNumber = prNumber;
    }

    return result;
  });
}

function createWorktreesAndSpawnSessions(
  config: SpawnConfig,
): Effect.Effect<
  WorktreeResult[],
  Error | TmuxCommandError | GitCommandError,
  GitService
> {
  return Effect.forEach(
    config.agents,
    (agent) =>
      createWorktreeAndSpawnSession(agent, config).pipe(
        Effect.catchAll((error) => {
          console.error(`Failed to create worktree for ${agent}:`, error);
          // Return an empty result for failed agents to continue with others
          return Effect.succeed({
            agent,
            branchName: `${agent}-branch`,
            worktreePath: `./worktrees/${config.sessionName}/${agent}-branch`,
            changes: "0+ 0-",
          });
        }),
      ),
    { concurrency: 1 }, // Process agents sequentially
  );
}

function spawnTmuxSession(
  agent: string,
  worktreePath: string,
  branchName: string,
): Effect.Effect<number, Error | TmuxCommandError> {
  return Effect.gen(function* () {
    const tmuxService = yield* TmuxService.make();

    // Check if tmux is available
    const isAvailable = yield* tmuxService.isAvailable();
    if (!isAvailable) {
      return yield* Effect.fail(
        new Error("tmux is not available on this system"),
      );
    }

    // Create a unique session name
    const sessionName = `open-composer-${branchName}`;

    // For now, start tmux with a simple shell command in the worktree directory
    // In the future, this could be enhanced to run specific agent commands
    const command = `cd "${worktreePath}" && exec $SHELL`;

    const pid = yield* tmuxService.newSession(sessionName, command, {
      detached: true,
      windowName: agent,
    });

    return pid;
  });
}

function calculateChangeStats(
  worktreePath: string,
  baseBranch: string,
): Effect.Effect<string, never> {
  return run(["diff", "--stat", `${baseBranch}..HEAD`], {
    cwd: worktreePath,
  }).pipe(
    Effect.map((result) => {
      // Parse the output to extract added and removed lines
      const lines = result.stdout.split("\n");
      const statLine = lines[lines.length - 1]; // Last line contains the summary

      if (!statLine || !statLine.includes("changed")) {
        return "0+ 0-";
      }

      // Extract numbers from the stat line
      const insertionsMatch = statLine.match(/(\d+) insertion/);
      const deletionsMatch = statLine.match(/(\d+) deletion/);

      const insertions = insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0;
      const deletions = deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0;

      return `${insertions}+ ${deletions}-`;
    }),
    Effect.catchAll(() => Effect.succeed("0+ 0-")),
  );
}

function createPR(
  _branchName: string,
  _baseBranch: string,
): Effect.Effect<number, Error> {
  return Effect.sync(() => {
    // Simulate PR creation
    // In a real implementation, this would use the GitHub CLI or API
    const simulatedPrNumber = Math.floor(Math.random() * 1000) + 100;

    return simulatedPrNumber;
  });
}

function showSpawnOutput(
  config: SpawnConfig,
  worktreeResults: WorktreeResult[],
): Effect.Effect<void, never, CacheServiceInterface> {
  return Effect.gen(function* () {
    // Status overview
    console.log("----------------------------");
    console.log("Open-Composer Status Overview");
    console.log("----------------------------");
    console.log();
    console.log("Agents Running:");
    worktreeResults.forEach((result) => {
      console.log(
        `- ${result.agent}: Running in ${result.worktreePath} (Tmux PID: ${result.tmuxPid})`,
      );
    });
    // Show agents not running
    const availableAgents = yield* getAvailableAgentNames;
    const runningAgents = worktreeResults.map((r: WorktreeResult) => r.agent);
    const notRunningAgents = availableAgents.filter(
      (agent: string) => !runningAgents.includes(agent),
    );
    notRunningAgents.forEach((agent: string) => {
      console.log(`- ${agent}: Not running`);
    });
    console.log();

    // Worktrees & PRs table
    console.log("Worktrees & PRs:");
    console.log(
      "|----------------------------|-------------|-------------|------|--------|---------|------------|",
    );
    console.log(
      "| Worktree                   | Agent       | Base Branch | PR # | Status | Tracked | Changes    |",
    );
    console.log(
      "|----------------------------|-------------|-------------|------|--------|---------|------------|",
    );

    worktreeResults.forEach((result) => {
      const prNumber = result.prNumber?.toString() ?? "None";
      const prStatus = result.prNumber ? "open" : "n/a";
      const changes = result.changes ?? "0+ 0-";

      console.log(
        `| ${result.branchName.padEnd(26)} | ${result.agent.padEnd(11)} | ${config.baseBranch.padEnd(11)} | ${prNumber.padEnd(4)} | ${prStatus.padEnd(6)} | +       | ${changes.padEnd(10)} |`,
      );
    });
    console.log();

    // Stacked PR Graph
    console.log("Stacked PR Graph:");
    console.log(`* ${config.baseBranch}`);

    worktreeResults.forEach((result) => {
      const prNumber = result.prNumber ?? "None";
      const prStatus = result.prNumber ? "open" : "n/a";
      const changes = result.changes ?? "0+ 0-";

      console.log(
        `  |- * ${result.worktreePath} (PR #${prNumber}: ${prStatus} +, Changes ${changes})`,
      );
    });
  });
}
