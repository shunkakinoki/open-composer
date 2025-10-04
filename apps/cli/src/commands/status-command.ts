import { Command } from "@effect/cli";
import {
  type AgentChecker,
  getAvailableAgents,
} from "@open-composer/agent-router";
import type { CacheServiceInterface } from "@open-composer/cache";
import { listPRs } from "@open-composer/gh-pr";
import { type GitService, run } from "@open-composer/git";
import { list } from "@open-composer/git-worktrees";
import { ProcessRunnerService } from "@open-composer/process-runner";
import * as Effect from "effect/Effect";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

interface WorktreeStatus {
  agent: string;
  branchName: string;
  worktreePath: string;
  processPid?: number;
  prNumber?: number;
  changes?: string;
  baseBranch: string;
}

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildStatusCommand(): CommandBuilder<"status"> {
  const command = () =>
    Command.make("status").pipe(
      Command.withDescription(
        "Show current status of agents, worktrees, and PRs",
      ),
      Command.withHandler(() =>
        Effect.gen(function* () {
          yield* trackCommand("status");
          yield* trackFeatureUsage("status");

          const status = yield* gatherStatus();
          yield* displayStatus(status);
        }),
      ),
    );

  return {
    command,
    metadata: {
      name: "status",
      description: "Show current status of agents, worktrees, and PRs",
    },
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get PR number for a given branch name
 */
function getPRNumber(
  branchName: string,
): Effect.Effect<number | undefined, never> {
  return Effect.gen(function* () {
    // List open PRs in JSON format with timeout
    const prsResult = yield* Effect.timeout(
      listPRs({
        state: "open",
        json: true,
      }),
      5000, // 5 second timeout
    ).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

    if (!prsResult) {
      return undefined;
    }

    try {
      const prs = JSON.parse(prsResult.stdout.trim());

      // Find PR where the head branch matches our branch name
      const matchingPR = prs.find(
        (pr: { headRefName: string; number: number }) =>
          pr.headRefName === branchName,
      );

      return matchingPR ? matchingPR.number : undefined;
    } catch (_error) {
      // If PR lookup fails, return undefined (don't break the status display)
      return undefined;
    }
  });
}

function gatherStatus(): Effect.Effect<WorktreeStatus[], never, GitService> {
  return Effect.gen(function* () {
    const runnerService = yield* ProcessRunnerService.make().pipe(
      Effect.catchAll(() =>
        Effect.die("Failed to create process runner service"),
      ),
    );

    // Get all worktrees
    const worktrees = yield* list().pipe(
      Effect.catchAll(() => Effect.succeed([])),
    );

    // Get all process runner sessions once
    const allSessions = yield* runnerService
      .listSessions()
      .pipe(Effect.catchAll(() => Effect.succeed([])));

    const statusResults: WorktreeStatus[] = [];

    for (const worktree of worktrees) {
      try {
        // Skip the main worktree and bare repositories
        if (worktree.bare || !worktree.branch) {
          continue;
        }

        // Check if worktree path exists (synchronously to avoid hanging)
        let pathExists = false;
        try {
          const fs = require("node:fs");
          fs.accessSync(worktree.path);
          pathExists = true;
        } catch {
          pathExists = false;
        }

        if (!pathExists) {
          continue;
        }

        // Extract agent name from branch (e.g., "codex-branch" -> "codex" or "codex-run-123" -> "codex")
        const agentMatch = worktree.branch.match(/^(.+?)(?:-branch|-run-\d+)$/);
        if (!agentMatch) {
          continue;
        }

        const agent = agentMatch[1];
        const branchName = worktree.branch;
        const worktreePath = worktree.path;

        // Check if process runner session is running
        let processPid: number | undefined;
        const sessionName = `open-composer-${branchName}`;
        const session = allSessions.find((s) => s.sessionName === sessionName);
        if (session) {
          processPid = session.pid;
        }

        // Calculate change stats
        const changes = yield* calculateChangeStats(worktreePath, "main");

        // Get PR status
        const prNumber = yield* getPRNumber(branchName);

        // Get base branch (assume main for now)
        const baseBranch = "main";

        const status: WorktreeStatus = {
          agent,
          branchName,
          worktreePath,
          baseBranch,
          ...(processPid !== undefined && { processPid }),
          ...(prNumber !== undefined && { prNumber }),
          ...(changes !== undefined && { changes }),
        };
        statusResults.push(status);
      } catch (_err) {
        // Skip worktrees that can't be processed
      }
    }

    return statusResults;
  });
}

function calculateChangeStats(
  worktreePath: string,
  baseBranch: string,
): Effect.Effect<string, never> {
  return Effect.gen(function* () {
    // Run git diff --stat to get change statistics with timeout
    const gitResult = yield* Effect.timeout(
      run(["diff", "--stat", `${baseBranch}..HEAD`], {
        cwd: worktreePath,
      }),
      3000, // 3 second timeout
    ).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

    if (!gitResult) {
      return "0+ 0-";
    }

    try {
      // Parse the output to extract added and removed lines
      const lines = gitResult.stdout.split("\n");
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

function displayStatus(
  worktreeStatuses: WorktreeStatus[],
): Effect.Effect<void, never, CacheServiceInterface> {
  return Effect.gen(function* () {
    // Group by base branch (assuming all use same base for now)
    const baseBranch = worktreeStatuses[0]?.baseBranch || "main";

    // Status overview
    console.log("Open-Composer Status Overview");
    console.log("----------------------------");
    console.log();

    console.log("Agents Running:");
    worktreeStatuses.forEach((status) => {
      const isRunning = status.processPid;
      if (isRunning) {
        const pidInfo = status.processPid
          ? `(Process PID: ${status.processPid})`
          : "";
        console.log(
          `- ${status.agent}: Running in ${status.worktreePath} ${pidInfo}`,
        );
      } else {
        console.log(`- ${status.agent}: Not running`);
      }
    });

    // Get available agents and show agents not running
    const availableAgents = yield* getAvailableAgents;
    const availableAgentNames = availableAgents.map(
      (agent: AgentChecker) => agent.definition.name,
    );

    const runningAgents = worktreeStatuses
      .filter((s) => s.processPid)
      .map((s: WorktreeStatus) => s.agent);
    const notRunningAgents = availableAgentNames.filter(
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

    worktreeStatuses.forEach((status) => {
      const prNumber = status.prNumber?.toString() ?? "None";
      const prStatus = status.prNumber ? "open" : "n/a";
      const changes = status.changes ?? "0+ 0-";

      console.log(
        `| ${status.branchName.padEnd(26)} | ${status.agent.padEnd(11)} | ${status.baseBranch.padEnd(11)} | ${prNumber.padEnd(4)} | ${prStatus.padEnd(6)} | +       | ${changes.padEnd(10)} |`,
      );
    });
    console.log();

    // Stacked PR Graph
    console.log("Stacked PR Graph:");
    console.log(`* ${baseBranch}`);

    worktreeStatuses.forEach((status) => {
      const prNumber = status.prNumber ?? "None";
      const prStatus = status.prNumber ? "open" : "n/a";
      const changes = status.changes ?? "0+ 0-";

      console.log(
        `  |- * ${status.worktreePath} (PR #${prNumber}: ${prStatus} +, Changes ${changes})`,
      );
    });
  });
}
