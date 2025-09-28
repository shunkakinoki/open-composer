import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { SqliteDrizzle } from "@open-composer/db";
import {
  createPR,
  getPRStatus,
  type PRCreateOptions,
  type PRCreateResult,
  type PRStatus,
} from "@open-composer/gh-pr";
import * as Effect from "effect/Effect";

const execFileAsync = promisify(execFile);

// Re-export types for backward compatibility
export type { PRCreateOptions, PRCreateResult, PRStatus };

export class PRCreateService {
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
          await execFileAsync("which", ["gh"]);
          cliAvailable = true;
        } catch {
          // CLI not available
        }

        if (!cliAvailable) {
          return { cliAvailable: false, authenticated: false };
        }

        // Check authentication status
        let authenticated = false;
        try {
          await execFileAsync("gh", ["auth", "status"]);
          authenticated = true;
        } catch {
          // Not authenticated
        }

        // Get repository info if authenticated
        let repository: string | undefined;
        if (authenticated) {
          try {
            const result = await execFileAsync("gh", [
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
    Error,
    SqliteDrizzle
  > {
    return Effect.tryPromise({
      try: async () => {
        // Get current branch
        const branchResult = await execFileAsync("git", [
          "rev-parse",
          "--abbrev-ref",
          "HEAD",
        ]);
        const currentBranch = branchResult.stdout.trim();

        // Check for uncommitted changes
        const statusResult = await execFileAsync("git", [
          "status",
          "--porcelain",
        ]);
        const hasUncommittedChanges = statusResult.stdout.trim().length > 0;

        // Check if on main branch
        const isOnMainBranch = ["main", "master"].includes(currentBranch);

        // Check if there are commits ahead of origin
        const aheadResult = await execFileAsync("git", [
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
   * Check if repository uses changesets
   */
  checkChangesetsSetup(): Effect.Effect<
    {
      hasChangesets: boolean;
      configPath?: string;
    },
    Error,
    SqliteDrizzle
  > {
    return Effect.gen(function* () {
      // Check for changesets directory
      const hasChangesetsDir = existsSync(".changeset");

      // Check for changesets config
      const configPaths = [".changeset/config.json", ".changeset/config.js"];
      let configPath: string | undefined;
      for (const config of configPaths) {
        if (existsSync(config)) {
          configPath = config;
          break;
        }
      }

      // Check package.json for changesets dependency
      const hasChangesetsDep =
        existsSync("package.json") &&
        (() => {
          try {
            const pkg = require(path.join(process.cwd(), "package.json"));
            return (
              "@changesets/cli" in (pkg.dependencies || {}) ||
              "@changesets/cli" in (pkg.devDependencies || {})
            );
          } catch {
            return false;
          }
        })();

      return {
        hasChangesets: hasChangesetsDir || !!configPath || hasChangesetsDep,
        configPath,
      };
    });
  }

  /**
   * Detect package manager
   */
  detectPackageManager(): Effect.Effect<string, Error, SqliteDrizzle> {
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
    Error,
    SqliteDrizzle
  > {
    return Effect.tryPromise({
      try: async () => {
        const errors: string[] = [];
        let lintPassed = false;
        let formatPassed = false;
        let testsPassed = false;

        // Run linting
        try {
          await execFileAsync(packageManager, ["run", "lint"]);
          lintPassed = true;
        } catch (error) {
          errors.push(`Linting failed: ${error}`);
        }

        // Run formatting check
        try {
          await execFileAsync(packageManager, ["run", "format:check"]);
          formatPassed = true;
        } catch (error) {
          // Try alternative format check commands
          try {
            await execFileAsync(packageManager, ["run", "format-check"]);
            formatPassed = true;
          } catch {
            errors.push(`Formatting check failed: ${error}`);
          }
        }

        // Run tests
        try {
          await execFileAsync(packageManager, ["run", "test"]);
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
   * Generate changeset if changesets is configured
   */
  generateChangeset(hasChangesets: boolean): Effect.Effect<
    {
      changesetGenerated: boolean;
      changesetPath?: string;
    },
    Error,
    SqliteDrizzle
  > {
    return Effect.tryPromise({
      try: async () => {
        if (!hasChangesets) {
          return { changesetGenerated: false };
        }

        // Get recent commit message for changeset content
        const commitResult = await execFileAsync("git", [
          "log",
          "--format=%B",
          "-n",
          "1",
        ]);
        const commitMessage = commitResult.stdout.trim();
        const title = commitMessage.split("\n")[0];

        // Generate changeset
        await execFileAsync("npx", [
          "@changesets/cli",
          "add",
          "--message",
          `${title}\n\n${commitMessage}`,
        ]);

        return { changesetGenerated: true };
      },
      catch: (error) => new Error(`Changeset generation failed: ${error}`),
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
}
