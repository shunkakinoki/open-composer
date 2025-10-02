import {
  type GitHubCommandError,
  type GitHubCommandResult,
  run,
} from "@open-composer/gh";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";

// Types
export interface PRCreateOptions {
  title: string;
  body: string;
  base: string;
  head: string;
  draft?: boolean;
  auto?: boolean; // Enable auto-merge
}

export interface PRCreateResult {
  number: number;
  url: string;
  autoMergeEnabled?: boolean;
}

export interface PRStatus {
  isInMergeQueue: boolean;
  mergeable: boolean;
  mergeStateStatus: string;
  autoMergeEnabled: boolean;
}

// PR creation command
export const createPR = (options: PRCreateOptions) =>
  Effect.gen(function* () {
    const args = ["pr", "create"];

    // Add title
    args.push("--title", options.title);

    // Add body
    args.push("--body", options.body);

    // Add base branch
    args.push("--base", options.base);

    // Add head branch
    args.push("--head", options.head);

    // Add draft flag if specified
    if (options.draft) {
      args.push("--draft");
    }

    // Execute PR creation
    const result: GitHubCommandResult = yield* run(args);

    // Extract PR number from output
    const output = result.stdout.trim();
    const prUrlMatch = output.match(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/,
    );
    if (!prUrlMatch) {
      return yield* Effect.fail(
        new Error("Could not extract PR number from GitHub CLI output"),
      );
    }

    const prNumber = parseInt(prUrlMatch[1], 10);
    const prUrl = prUrlMatch[0];

    let autoMergeEnabled = false;

    // Enable auto-merge if requested
    if (options.auto) {
      try {
        yield* run(["pr", "merge", prNumber.toString(), "--squash", "--auto"]);
        autoMergeEnabled = true;
      } catch (error) {
        Console.warn(`Warning: Could not enable auto-merge: ${error}`);
      }
    }

    return {
      number: prNumber,
      url: prUrl,
      autoMergeEnabled,
    };
  });

// PR status checking
export const getPRStatus = (prNumber: number) =>
  Effect.gen(function* () {
    const result: GitHubCommandResult = yield* run([
      "pr",
      "view",
      prNumber.toString(),
      "--json",
      "isInMergeQueue,mergeable,mergeStateStatus",
    ]);
    const data = JSON.parse(result.stdout.trim());

    // Check if auto-merge is enabled
    let autoMergeEnabled = false;
    try {
      const autoMergeResult: GitHubCommandResult = yield* run([
        "pr",
        "view",
        prNumber.toString(),
        "--json",
        "mergeQueueEntry",
      ]);
      const autoMergeData = JSON.parse(autoMergeResult.stdout.trim());
      autoMergeEnabled = !!autoMergeData.mergeQueueEntry;
    } catch {
      // Auto-merge check failed, assume not enabled
    }

    return {
      isInMergeQueue: data.isInMergeQueue || false,
      mergeable: data.mergeable !== false,
      mergeStateStatus: data.mergeStateStatus || "unknown",
      autoMergeEnabled,
    };
  });

// PR listing
export const listPRs = (options?: {
  readonly state?: "open" | "closed" | "merged" | "all";
  readonly author?: string;
  readonly assignee?: string;
  readonly limit?: number;
  readonly json?: boolean;
}): Effect.Effect<GitHubCommandResult, GitHubCommandError> => {
  const args = ["pr", "list"];

  if (options?.state) {
    args.push("--state", options.state);
  }
  if (options?.author) {
    args.push("--author", options.author);
  }
  if (options?.assignee) {
    args.push("--assignee", options.assignee);
  }
  if (options?.limit) {
    args.push("--limit", options.limit.toString());
  }
  if (options?.json) {
    args.push("--json");
  }

  return run(args);
};

// PR viewing
export const viewPR = (
  prNumber: number | string,
  options?: {
    readonly json?: string;
    readonly web?: boolean;
  },
): Effect.Effect<GitHubCommandResult, GitHubCommandError> => {
  const args = ["pr", "view", prNumber.toString()];

  if (options?.json) {
    args.push("--json", options.json);
  }
  if (options?.web) {
    args.push("--web");
  }

  return run(args);
};

// PR merging
export const mergePR = (
  prNumber: number,
  options?: {
    readonly method?: "merge" | "squash" | "rebase";
    readonly auto?: boolean;
    readonly deleteBranch?: boolean;
  },
): Effect.Effect<GitHubCommandResult, GitHubCommandError> => {
  const args = ["pr", "merge", prNumber.toString()];

  if (options?.method) {
    args.push(`--${options.method}`);
  }
  if (options?.auto) {
    args.push("--auto");
  }
  if (options?.deleteBranch) {
    args.push("--delete-branch");
  }

  return run(args);
};

// Types are exported inline above
