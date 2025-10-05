import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import {
  createPR,
  getPRStatus,
  listPRs,
  mergePR,
  type PRCreateOptions,
  type PRCreateResult,
  type PRStatus,
  viewPR,
} from "@open-composer/gh-pr";
import * as Effect from "effect/Effect";

const execFileAsync = promisify(execFile);

export class GhPRService {
  // Allow overriding execFileAsync for testing
  execFileAsync: (
    command: string,
    args: string[],
  ) => Promise<{ stdout: string; stderr: string }> = execFileAsync;
  /**
   * Check if GitHub CLI is available and authenticated
   */
  checkGitHubCliSetup(): Effect.Effect<
    {
      cliAvailable: boolean;
      authenticated: boolean;
      repository?: string;
    },
    Error
  > {
    return Effect.tryPromise({
      try: async () => {
        // Check if gh CLI is available
        let cliAvailable = false;
        try {
          await this.execFileAsync("which", ["gh"]);
          cliAvailable = true;
        } catch {
          // CLI not available
        }

        if (!cliAvailable) {
          return {
            cliAvailable: false,
            authenticated: false,
            repository: undefined,
          };
        }

        // Check authentication status
        let authenticated = false;
        try {
          await this.execFileAsync("gh", ["auth", "status"]);
          authenticated = true;
        } catch {
          // Not authenticated
        }

        // Get repository info if authenticated
        let repository: string | undefined;
        if (authenticated) {
          try {
            const result = await this.execFileAsync("gh", [
              "repo",
              "view",
              "--json",
              "nameWithOwner",
              "-q",
              ".nameWithOwner",
            ]);
            repository = result.stdout.trim();
          } catch {
            // Repository info not available, but that's ok
          }
        }

        return {
          cliAvailable: true,
          authenticated,
          repository,
        };
      },
      catch: (error) => new Error(`GitHub CLI setup check failed: ${error}`),
    });
  }

  /**
   * Validate current branch and git status
   */
  validateGitState(): Effect.Effect<
    {
      currentBranch: string;
      hasChanges: boolean;
      hasUncommittedChanges: boolean;
      isOnMainBranch: boolean;
    },
    Error
  > {
    return Effect.tryPromise({
      try: async () => {
        // Get current branch
        const branchResult = await this.execFileAsync("git", [
          "rev-parse",
          "--abbrev-ref",
          "HEAD",
        ]);
        const currentBranch = branchResult.stdout.trim();

        // Check for uncommitted changes
        const statusResult = await this.execFileAsync("git", [
          "status",
          "--porcelain",
        ]);
        const hasUncommittedChanges = statusResult.stdout.trim().length > 0;

        // Check if on main branch
        const isOnMainBranch = ["main", "master"].includes(currentBranch);

        // Check if there are commits ahead of origin
        const aheadResult = await this.execFileAsync("git", [
          "rev-list",
          "--count",
          `${currentBranch}..origin/${currentBranch}`,
        ]);
        const commitsAhead = parseInt(aheadResult.stdout.trim(), 10) || 0;

        return {
          currentBranch,
          hasChanges: commitsAhead > 0,
          hasUncommittedChanges,
          isOnMainBranch,
        };
      },
      catch: (error) => new Error(`Git state validation failed: ${error}`),
    });
  }

  /**
   * Detect package manager
   */
  detectPackageManager(): Effect.Effect<string, Error> {
    if (existsSync("bun.lockb") || existsSync("bun.lock")) {
      return Effect.succeed("bun");
    }
    if (existsSync("pnpm-lock.yaml")) {
      return Effect.succeed("pnpm");
    }
    if (existsSync("yarn.lock")) {
      return Effect.succeed("yarn");
    }
    if (existsSync("package-lock.json")) {
      return Effect.succeed("npm");
    }
    return Effect.succeed("npm"); // fallback
  }

  /**
   * Run quality checks (linting, formatting, tests)
   */
  runQualityChecks(packageManager: string): Effect.Effect<
    {
      lintPassed: boolean;
      formatPassed: boolean;
      testsPassed: boolean;
      errors: string[];
    },
    Error
  > {
    return Effect.tryPromise({
      try: async () => {
        const errors: string[] = [];
        let lintPassed = false;
        let formatPassed = false;
        let testsPassed = false;

        // Run linting
        try {
          await this.execFileAsync(packageManager, ["run", "lint"]);
          lintPassed = true;
        } catch (error) {
          errors.push(`Linting failed: ${error}`);
        }

        // Run formatting check
        try {
          await this.execFileAsync(packageManager, ["run", "format:check"]);
          formatPassed = true;
        } catch (error) {
          // Try alternative format check commands
          try {
            await this.execFileAsync(packageManager, ["run", "format-check"]);
            formatPassed = true;
          } catch {
            errors.push(`Formatting check failed: ${error}`);
          }
        }

        // Run tests
        try {
          await this.execFileAsync(packageManager, ["run", "test"]);
          testsPassed = true;
        } catch (error) {
          errors.push(`Tests failed: ${error}`);
        }

        return {
          lintPassed,
          formatPassed,
          testsPassed,
          errors,
        };
      },
      catch: (error) => new Error(`Quality checks failed: ${error}`),
    });
  }

  /**
   * Create the pull request
   */
  createPullRequest(
    options: PRCreateOptions,
  ): Effect.Effect<PRCreateResult, Error> {
    return createPR(options) as Effect.Effect<PRCreateResult, Error>;
  }

  /**
   * Get PR status and auto-merge information
   */
  getPRStatus(prNumber: number): Effect.Effect<PRStatus, Error> {
    return getPRStatus(prNumber).pipe(
      Effect.mapError(
        (error) => new Error(`Could not get PR status: ${error}`),
      ),
    ) as Effect.Effect<PRStatus, Error>;
  }

  /**
   * List pull requests
   */
  listPRs(options?: {
    readonly state?: "open" | "closed" | "merged" | "all";
    readonly author?: string;
    readonly assignee?: string;
    readonly limit?: number;
    readonly json?: boolean;
  }): Effect.Effect<string, Error> {
    return listPRs(options).pipe(
      Effect.map((result) => result.stdout),
      Effect.mapError((error) => new Error(`Could not list PRs: ${error}`)),
    );
  }

  /**
   * View pull request details
   */
  viewPR(
    prNumber: number | string,
    options?: {
      readonly json?: string;
      readonly web?: boolean;
    },
  ): Effect.Effect<string, Error> {
    return viewPR(prNumber, options).pipe(
      Effect.map((result) => result.stdout),
      Effect.mapError((error) => new Error(`Could not view PR: ${error}`)),
    );
  }

  /**
   * Merge a pull request
   */
  mergePR(
    prNumber: number,
    options?: {
      readonly method?: "merge" | "squash" | "rebase";
      readonly auto?: boolean;
      readonly deleteBranch?: boolean;
    },
  ): Effect.Effect<string, Error> {
    return mergePR(prNumber, options).pipe(
      Effect.map((result) => result.stdout),
      Effect.mapError((error) => new Error(`Could not merge PR: ${error}`)),
    );
  }
}
