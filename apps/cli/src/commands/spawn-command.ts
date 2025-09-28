import { Args, Command, Options } from "@effect/cli";
import {
  type GitCommandError,
  GitLive,
  type GitService,
  run,
} from "@open-composer/git";
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
          return yield* Effect.tryPromise({
            try: async () => {
              const { waitUntilExit } = render(
                React.createElement(SpawnPrompt, {
                  onComplete: (spawnConfig: SpawnConfig) => {
                    Effect.runPromise(
                      executeSpawn(spawnConfig).pipe(Effect.provide(GitLive)),
                    ).catch(console.error);
                  },
                  onCancel: () => {
                    console.log("❌ Spawn cancelled");
                    process.exit(0);
                  },
                }),
              );
              await waitUntilExit();
            },
            catch: (error) =>
              new Error(
                `Failed to start interactive spawn: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              ),
          });
        }
      }),
    ),
  );
}

function executeSpawn(
  config: SpawnConfig,
): Effect.Effect<void, Error | TmuxCommandError | GitCommandError, GitService> {
  return Effect.gen(function* () {
    console.log(`\n🪄 Spawning session: ${config.sessionName}`);
    console.log(`📋 Agents: ${config.agents.join(", ")}`);
    console.log(`🌿 Base branch: ${config.baseBranch}`);
    console.log(`🔗 Create PRs: ${config.createPR ? "Yes" : "No"}\n`);

    // Create worktrees and spawn tmux sessions for each agent
    const worktreeResults = yield* createWorktreesAndSpawnSessions(config);

    // Show the final status output
    showSpawnOutput(config, worktreeResults);
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

function createWorktreesAndSpawnSessions(
  config: SpawnConfig,
): Effect.Effect<
  WorktreeResult[],
  Error | TmuxCommandError | GitCommandError,
  GitService
> {
  return Effect.gen(function* () {
    const results: WorktreeResult[] = [];

    for (const agent of config.agents) {
      const branchName = `${agent}-branch`;
      const worktreePath = `./worktrees/${config.sessionName}/${branchName}`;

      try {
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

        // Spawn tmux session (simulated for now)
        const tmuxPid = yield* spawnTmuxSession(
          agent,
          worktreePath,
          branchName,
        );
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

        results.push({
          agent,
          branchName,
          worktreePath,
          tmuxPid,
          prNumber,
          changes,
        });
      } catch (error) {
        console.error(`Failed to create worktree for ${agent}:`, error);
        // Continue with other agents
      }
    }

    return results;
  });
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
): Effect.Effect<string, Error | GitCommandError> {
  return Effect.gen(function* () {
    try {
      // Run git diff --stat to get change statistics
      const result = yield* run(["diff", "--stat", `${baseBranch}..HEAD`], {
        cwd: worktreePath,
      });

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
    } catch (_error) {
      // If git diff fails (e.g., no changes), return 0+ 0-
      return "0+ 0-";
    }
  });
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
) {
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
  const allAgents = ["codex", "claude-code", "opencode"];
  const runningAgents = worktreeResults.map((r) => r.agent);
  const notRunningAgents = allAgents.filter(
    (agent) => !runningAgents.includes(agent),
  );
  notRunningAgents.forEach((agent) => {
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
}

export const buildSpawnCommand = () => buildSpawnCommandInternal();
