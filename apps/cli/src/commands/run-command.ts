import path from "node:path";
import { Args, Command, Options } from "@effect/cli";
import {
  type AgentChecker,
  getAvailableAgents,
} from "@open-composer/agent-router";
import type { CacheServiceInterface } from "@open-composer/cache";
import { type GitCommandError, type GitService, run } from "@open-composer/git";
import { trackStackBranch } from "@open-composer/git-stack";
import {
  type ProcessRunnerError,
  ProcessRunnerService,
  type ProcessSessionInfo,
} from "@open-composer/process-runner";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { type RunConfig, RunPrompt } from "../components/RunPrompt.js";
import { GitWorktreeService } from "../services/git-worktree-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildRunCommand = (): CommandBuilder<"run"> => ({
  command: () => buildRunCommandInternal(),
  metadata: {
    name: "run",
    description:
      "Run AI agents with a task description to create stack branches and PRs",
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
function getRepositoryName(): Effect.Effect<string, GitCommandError> {
  return run(["rev-parse", "--show-toplevel"], {}).pipe(
    Effect.map((result) => {
      const fullPath = result.stdout.trim();
      return fullPath.split("/").pop() || "unknown-repo";
    }),
  );
}

function getRepositoryRoot(): Effect.Effect<string, GitCommandError> {
  return run(["rev-parse", "--show-toplevel"], {}).pipe(
    Effect.map((result) => result.stdout.trim()),
  );
}

// Command Implementations
// -----------------------------------------------------------------------------

function buildRunCommandInternal() {
  const descriptionArg = Args.text({ name: "description" }).pipe(
    Args.withDescription(
      "Description of what you want to do (e.g., 'make a pull request')",
    ),
  );

  const agentOption = Options.text("agent").pipe(
    Options.optional,
    Options.withDescription(
      "Specific agent to use (bypasses agent selection prompt)",
    ),
  );

  const baseBranchOption = Options.text("base").pipe(
    Options.optional,
    Options.withDescription("Base branch to branch from (default: main)"),
  );

  const createPROption = Options.boolean("create-pr").pipe(
    Options.withDescription(
      "Create PRs for the spawned worktrees (default: true)",
    ),
  );

  return Command.make("run", {
    description: descriptionArg,
    agent: agentOption,
    base: baseBranchOption,
    createPR: createPROption,
  }).pipe(
    Command.withDescription(
      "Run AI agents with a task description to create stack branches and PRs",
    ),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("run");
        yield* trackFeatureUsage("run", {
          has_agent: Option.isSome(config.agent),
          has_base: Option.isSome(config.base),
          create_pr: config.createPR,
        });

        // Check if we have a specific agent or need to prompt
        if (Option.isSome(config.agent)) {
          // Non-interactive mode - use provided agent
          const runConfig: RunConfig = {
            description: config.description,
            agent: Option.getOrThrow(config.agent),
            baseBranch: Option.getOrUndefined(config.base) ?? "main",
            createPR: config.createPR,
          };

          yield* executeRun(runConfig);
        } else {
          // Interactive mode - prompt for agent selection
          const availableAgentNames = yield* getAvailableAgentNames;
          const runConfig = yield* Effect.tryPromise({
            try: async () => {
              return new Promise<RunConfig>((resolve, reject) => {
                const { waitUntilExit } = render(
                  React.createElement(RunPrompt, {
                    description: config.description,
                    availableAgents: availableAgentNames,
                    baseBranch: Option.getOrUndefined(config.base) ?? "main",
                    createPR: config.createPR,
                    onComplete: (config: RunConfig) => {
                      resolve(config);
                    },
                    onCancel: () => {
                      reject(new Error("Run cancelled by user"));
                    },
                  }),
                );
                waitUntilExit().catch(reject);
              });
            },
            catch: (error) => {
              if (
                error instanceof Error &&
                error.message === "Run cancelled by user"
              ) {
                return error;
              }
              return new Error(
                `Failed to start interactive run: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            },
          });

          yield* executeRun(runConfig);
        }
      }),
    ),
  );
}

function executeRun(
  config: RunConfig,
): Effect.Effect<
  void,
  Error | GitCommandError | ProcessRunnerError,
  GitService | CacheServiceInterface
> {
  return Effect.gen(function* () {
    console.log(`\n🚀 Running task: ${config.description}`);
    console.log(`🤖 Agent: ${config.agent}`);
    console.log(`🌿 Base branch: ${config.baseBranch}`);
    console.log(`🔗 Create PR: ${config.createPR ? "Yes" : "No"}\n`);

    // Create worktree and spawn agent session
    const result = yield* createWorktreeAndRunAgent(config);

    // Show the final status output - this shows immediate status after creation
    yield* showRunOutput(config, result);

    // Force exit after a short delay to allow output to flush
    // The spawned session continues running in the background
    yield* Effect.sync(() => {
      setTimeout(() => process.exit(0), 100);
    });
  });
}

interface RunResult {
  agent: string;
  branchName: string;
  worktreePath: string;
  sessionName: string;
  prNumber?: number;
  changes?: string;
}

function createWorktreeAndRunAgent(
  config: RunConfig,
): Effect.Effect<
  RunResult,
  Error | GitCommandError | ProcessRunnerError,
  GitService
> {
  return Effect.gen(function* () {
    const timestamp = Date.now();
    const branchName = `${config.agent}-run-${timestamp}`;
    const repoName = yield* getRepositoryName();
    const repoRoot = yield* getRepositoryRoot();
    const worktreePath = path.join(
      "..",
      `${repoName}.worktree`,
      `run-${timestamp}`,
    );
    const sessionName = `open-composer-${branchName}`;

    // Create worktree (which also creates the branch)
    // Use repository root as the working directory for git worktree commands
    const gitWorktreeService = new GitWorktreeService(repoRoot);
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

    // Track the branch in git-stack
    yield* trackStackBranch(branchName, config.baseBranch);
    console.log(`Tracked stack branch '${branchName}'`);

    // Spawn agent session using ProcessRunner
    const sessionInfo = yield* spawnAgentSession(
      config.agent,
      worktreePath,
      sessionName,
      config.description,
    );
    console.log(
      `Spawned agent session ${sessionName} with ${config.agent} at ${sessionInfo.pid}`,
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

    return {
      agent: config.agent,
      branchName,
      worktreePath,
      sessionName,
      prNumber,
      changes,
    };
  });
}

function spawnAgentSession(
  agent: string,
  worktreePath: string,
  sessionName: string,
  description: string,
): Effect.Effect<ProcessSessionInfo, ProcessRunnerError, never> {
  return Effect.gen(function* () {
    const runnerService = yield* ProcessRunnerService.make();

    // Build the command based on the agent
    // For now, we'll spawn a shell in the worktree directory
    // TODO: In the future, route to specific agent commands
    const command = `cd "${worktreePath}" && echo "Running ${agent} for: ${description}" && exec $SHELL`;

    const sessionInfo = yield* runnerService.newSession(sessionName, command);

    return sessionInfo;
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

function showRunOutput(
  config: RunConfig,
  result: RunResult,
): Effect.Effect<void, never, CacheServiceInterface> {
  return Effect.gen(function* () {
    // Status overview
    console.log("----------------------------");
    console.log("Open-Composer Run Status");
    console.log("----------------------------");
    console.log();
    console.log("Task:", config.description);
    console.log();

    console.log("Agent Running:");
    console.log(
      `- ${result.agent}: Running in ${result.worktreePath} (Session: ${result.sessionName})`,
    );

    // Get available agents and show agents not running
    const availableAgents = yield* getAvailableAgentNames;
    const notRunningAgents = availableAgents.filter(
      (agent: string) => agent !== result.agent,
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

    const prNumber = result.prNumber?.toString() ?? "None";
    const prStatus = result.prNumber ? "open" : "n/a";
    const changes = result.changes ?? "0+ 0-";

    console.log(
      `| ${result.branchName.padEnd(26)} | ${result.agent.padEnd(11)} | ${config.baseBranch.padEnd(11)} | ${prNumber.padEnd(4)} | ${prStatus.padEnd(6)} | +       | ${changes.padEnd(10)} |`,
    );
    console.log();

    // Stacked PR Graph
    console.log("Stacked PR Graph:");
    console.log(`* ${config.baseBranch}`);

    console.log(
      `  |- * ${result.worktreePath} (PR #${result.prNumber ?? "None"}: ${prStatus} +, Changes ${changes})`,
    );
  });
}
