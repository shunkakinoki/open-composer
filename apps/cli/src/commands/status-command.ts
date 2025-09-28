import { Command } from "@effect/cli";
import { type GitCommandError, type GitService, run } from "@open-composer/git";
import { type GitWorktreeError, list } from "@open-composer/git-worktrees";
import { type TmuxCommandError, TmuxService } from "@open-composer/tmux";
import * as Effect from "effect/Effect";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";

interface WorktreeStatus {
  agent: string;
  branchName: string;
  worktreePath: string;
  tmuxPid?: number;
  prNumber?: number;
  changes?: string;
  baseBranch: string;
}

export function buildStatusCommand() {
  return Command.make("status").pipe(
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
}

function gatherStatus(): Effect.Effect<
  WorktreeStatus[],
  Error | TmuxCommandError | GitCommandError | GitWorktreeError,
  GitService
> {
  return Effect.gen(function* () {
    const tmuxService = yield* TmuxService.make();

    // Get all worktrees
    const worktrees = yield* list();
    console.log(`Found ${worktrees.length} worktrees`);

    const statusResults: WorktreeStatus[] = [];

    for (const worktree of worktrees) {
      try {
        // Skip the main worktree and bare repositories
        if (worktree.bare || !worktree.branch) {
          console.log(
            `Skipping worktree ${worktree.path} (bare: ${worktree.bare}, branch: ${worktree.branch})`,
          );
          continue;
        }

        // Extract agent name from branch (e.g., "codex-branch" -> "codex")
        const agentMatch = worktree.branch.match(/^(.+)-branch$/);
        if (!agentMatch) {
          console.log(`Branch ${worktree.branch} doesn't match agent pattern`);
          continue;
        }

        const agent = agentMatch[1];
        const branchName = worktree.branch;
        const worktreePath = worktree.path;

        // Check if tmux session is running
        let tmuxPid: number | undefined;
        try {
          const sessionName = `open-composer-${branchName}`;
          tmuxPid = yield* tmuxService.getSessionPid(sessionName);
        } catch {
          // Session not running, leave tmuxPid undefined
        }

        // Calculate change stats
        const changes = yield* calculateChangeStats(worktreePath, "main");

        // TODO: Get PR status - for now we'll simulate
        const prNumber = yield* getPRNumber(branchName);

        // Get base branch (assume main for now)
        const baseBranch = "main";

        statusResults.push({
          agent,
          branchName,
          worktreePath,
          tmuxPid,
          prNumber,
          changes,
          baseBranch,
        });
      } catch (error) {
        // Skip worktrees that can't be processed
        console.warn(`Could not process worktree ${worktree.path}:`, error);
      }
    }

    return statusResults;
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

function getPRNumber(
  _branchName: string,
): Effect.Effect<number | undefined, never> {
  return Effect.sync(() => {
    // TODO: Implement actual PR lookup
    // For now, return undefined (no PR)
    return undefined;
  });
}

function displayStatus(worktreeStatuses: WorktreeStatus[]) {
  return Effect.sync(() => {
    // Group by base branch (assuming all use same base for now)
    const baseBranch = worktreeStatuses[0]?.baseBranch || "main";

    // Status overview
    console.log("Open-Composer Status Overview");
    console.log("----------------------------");
    console.log();

    console.log("Agents Running:");
    worktreeStatuses.forEach((status) => {
      if (status.tmuxPid) {
        console.log(
          `- ${status.agent}: Running in ${status.worktreePath} (Tmux PID: ${status.tmuxPid})`,
        );
      } else {
        console.log(`- ${status.agent}: Not running`);
      }
    });

    // Show agents not running
    const allAgents = ["codex", "claude-code", "opencode"];
    const runningAgents = worktreeStatuses
      .filter((s) => s.tmuxPid)
      .map((s) => s.agent);
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
