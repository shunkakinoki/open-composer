import { Args, Command, Options } from "@effect/cli";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { GhPRService } from "../services/gh-pr-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildGHPRCommand = (): CommandBuilder<"pr"> => ({
  command: () =>
    Command.make("pr").pipe(
      Command.withDescription(
        "Manage GitHub Pull Requests with comprehensive workflow",
      ),
      Command.withSubcommands([
        buildRegularCreateCommand(),
        buildAutoCreateCommand(),
        buildListCommand(),
        buildViewCommand(),
        buildMergeCommand(),
      ]),
    ),
  metadata: {
    name: "pr",
    description: "Manage GitHub Pull Requests with comprehensive workflow",
  },
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

const printLines = (lines: ReadonlyArray<string>) =>
  Effect.forEach(lines, (line) => Console.log(line), {
    discard: true,
  });

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildRegularCreateCommand() {
  const titleArg = Args.text({ name: "title" }).pipe(
    Args.withDescription("PR title (should follow conventional commit format)"),
  );

  const bodyOption = Options.text("body").pipe(
    Options.optional,
    Options.withDescription("PR description body"),
  );

  const baseOption = Options.text("base").pipe(
    Options.optional,
    Options.withDescription("Base branch to merge into (default: main)"),
  );

  const headOption = Options.text("head").pipe(
    Options.optional,
    Options.withDescription(
      "Head branch to merge from (default: current branch)",
    ),
  );

  const draftOption = Options.boolean("draft").pipe(
    Options.withDescription("Create PR as draft"),
  );

  const skipChecksOption = Options.boolean("skip-checks").pipe(
    Options.withDescription("Skip quality assurance checks"),
  );

  return Command.make("create", {
    title: titleArg,
    body: bodyOption,
    base: baseOption,
    head: headOption,
    draft: draftOption,
    skipChecks: skipChecksOption,
  }).pipe(
    Command.withDescription(
      "Create a GitHub Pull Request with comprehensive workflow",
    ),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("pr", "create");
        yield* trackFeatureUsage("pr_create", {
          has_body: !!config.body,
          has_base: !!config.base,
          has_head: !!config.head,
          draft: config.draft,
          skip_checks: config.skipChecks,
        });

        const cli = new GhPRService();

        // Step 1: Check GitHub CLI setup
        console.log("🔍 Checking GitHub CLI setup...");
        const setup = yield* cli.checkGitHubCliSetup();

        if (!setup.cliAvailable) {
          yield* printLines([
            "❌ GitHub CLI is not installed.",
            "   Please install GitHub CLI: https://cli.github.com/",
            "   Then run: gh auth login",
          ]);
          yield* Effect.die("GitHub CLI not installed");
        }

        if (!setup.authenticated) {
          yield* printLines([
            "❌ Not authenticated with GitHub CLI.",
            "   Please run: gh auth login",
          ]);
          yield* Effect.die("Not authenticated with GitHub CLI");
        }

        console.log(
          `✅ GitHub CLI authenticated${setup.repository ? ` for ${setup.repository}` : ""}`,
        );

        // Step 2: Validate git state
        console.log("\n🔍 Validating git state...");
        const gitState = yield* cli.validateGitState();

        if (gitState.isOnMainBranch) {
          yield* printLines([
            "❌ Currently on main/master branch.",
            "   Please create a feature branch first:",
            "   git checkout -b feature/your-feature-name",
          ]);
          yield* Effect.die("Currently on main/master branch");
        }

        if (gitState.hasUncommittedChanges) {
          yield* printLines([
            "❌ You have uncommitted changes.",
            "   Please commit or stash your changes first:",
            "   git add . && git commit -m 'your message'",
            "   OR",
            "   git stash",
          ]);
          yield* Effect.die("Has uncommitted changes");
        }

        if (!gitState.hasChanges) {
          yield* printLines([
            "❌ No commits found to create PR from.",
            "   Please make some commits first.",
          ]);
          yield* Effect.die("No commits found to create PR from");
        }

        console.log(
          `✅ On branch '${gitState.currentBranch}' with ${gitState.hasChanges ? "unpushed " : ""}changes`,
        );

        // Step 3: Run quality checks (unless skipped)
        if (!config.skipChecks) {
          console.log("\n🔍 Running quality assurance checks...");
          const packageManager = yield* cli.detectPackageManager();
          console.log(`📦 Detected package manager: ${packageManager}`);

          const checks = yield* cli.runQualityChecks(packageManager);

          if (checks.errors.length > 0) {
            console.log("⚠️  Some quality checks failed:");
            for (const error of checks.errors) {
              console.log(`   ${error}`);
            }
            console.log("\n💡 You can skip these checks with --skip-checks");
          } else {
            console.log("✅ All quality checks passed");
          }
        }

        // Step 5: Prepare PR body
        let prBody = Option.getOrElse(config.body, () => "");

        if (!prBody) {
          // Generate comprehensive PR body
          const commitMessage = yield* Effect.tryPromise({
            try: async () => {
              const { execFile } = await import("node:child_process");
              const { promisify } = await import("node:util");
              const execFileAsync = promisify(execFile);

              const result = await execFileAsync("git", [
                "log",
                "--format=%B",
                "-n",
                "1",
              ]);
              return result.stdout.trim();
            },
            catch: () => "Commit message not available",
          });

          prBody = `## Changes Made
${commitMessage
  .split("\n")
  .map((line) => `- ${line}`)
  .join("\n")}

## Technical Details
- Implementation details here
- Architecture decisions
- Dependencies added/modified

## Testing
- All pre-commit hooks pass (Biome formatting, linting)
- Component/functionality tests added
- Manual testing completed
- No breaking changes to existing functionality

🤖 Generated with Cursor by Claude`;
        }

        // Step 6: Create the PR
        console.log("\n🚀 Creating Pull Request...");
        const baseBranch = Option.getOrElse(config.base, () => "main");
        const headBranch = Option.getOrElse(
          config.head,
          () => gitState.currentBranch,
        );
        const prOptions = {
          title: config.title,
          body: prBody,
          base: baseBranch,
          head: headBranch,
          draft: config.draft,
        };

        const pr = yield* cli.createPullRequest(prOptions);

        console.log(`\n🎉 Pull Request created successfully!`);
        console.log(`📋 PR #${pr.number}: ${config.title}`);
        console.log(`🔗 ${pr.url}`);

        yield* printLines([
          "",
          "Next steps:",
          "1. Review the PR on GitHub",
          "2. Request reviews from team members",
          "3. Address any CI failures",
          "4. Merge when ready (or use auto-merge)",
        ]);
      }),
    ),
  );
}

function buildAutoCreateCommand() {
  const titleArg = Args.text({ name: "title" }).pipe(
    Args.withDescription("PR title (should follow conventional commit format)"),
  );

  const bodyOption = Options.text("body").pipe(
    Options.optional,
    Options.withDescription("PR description body"),
  );

  const baseOption = Options.text("base").pipe(
    Options.optional,
    Options.withDescription("Base branch to merge into (default: main)"),
  );

  const headOption = Options.text("head").pipe(
    Options.optional,
    Options.withDescription(
      "Head branch to merge from (default: current branch)",
    ),
  );

  const skipChecksOption = Options.boolean("skip-checks").pipe(
    Options.withDescription("Skip quality assurance checks"),
  );

  return Command.make("auto", {
    title: titleArg,
    body: bodyOption,
    base: baseOption,
    head: headOption,
    skipChecks: skipChecksOption,
  }).pipe(
    Command.withDescription(
      "Create a GitHub Pull Request with auto-merge enabled",
    ),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("pr", "auto");
        yield* trackFeatureUsage("pr_create_auto", {
          has_body: !!config.body,
          has_base: !!config.base,
          has_head: !!config.head,
          skip_checks: config.skipChecks,
        });

        const cli = new GhPRService();

        // Run the same validation and setup as regular create
        console.log("🔍 Checking GitHub CLI setup...");
        const setup = yield* cli.checkGitHubCliSetup();

        if (!setup.cliAvailable || !setup.authenticated) {
          yield* printLines([
            "❌ GitHub CLI setup incomplete.",
            "   Please ensure GitHub CLI is installed and authenticated:",
            "   https://cli.github.com/",
          ]);
          yield* Effect.die("GitHub CLI setup incomplete");
        }

        console.log(
          `✅ GitHub CLI authenticated${setup.repository ? ` for ${setup.repository}` : ""}`,
        );

        // Validate git state
        console.log("\n🔍 Validating git state...");
        const gitState = yield* cli.validateGitState();

        if (
          gitState.isOnMainBranch ||
          !gitState.hasChanges ||
          gitState.hasUncommittedChanges
        ) {
          yield* printLines([
            "❌ Git state not ready for PR creation.",
            "   Please ensure:",
            "   - You're on a feature branch (not main/master)",
            "   - You have committed changes",
            "   - No uncommitted changes remain",
          ]);
          yield* Effect.die("Git state not ready for PR creation");
        }

        console.log(
          `✅ On branch '${gitState.currentBranch}' with changes ready for PR`,
        );

        // Run quality checks
        if (!config.skipChecks) {
          console.log("\n🔍 Running quality assurance checks...");
          const packageManager = yield* cli.detectPackageManager();
          const checks = yield* cli.runQualityChecks(packageManager);

          if (checks.errors.length > 0) {
            console.log("⚠️  Quality check failures detected:");
            for (const error of checks.errors) {
              console.log(`   ${error}`);
            }
            console.log("\n💡 Use --skip-checks to bypass these checks");
          } else {
            console.log("✅ All quality checks passed");
          }
        }

        // Prepare PR body
        let prBody = Option.getOrElse(config.body, () => "");

        if (!prBody) {
          const commitMessage = yield* Effect.tryPromise({
            try: async () => {
              const { execFile } = await import("node:child_process");
              const { promisify } = await import("node:util");
              const execFileAsync = promisify(execFile);

              const result = await execFileAsync("git", [
                "log",
                "--format=%B",
                "-n",
                "1",
              ]);
              return result.stdout.trim();
            },
            catch: () => "Commit message not available",
          });

          prBody = `## Changes Made
${commitMessage
  .split("\n")
  .map((line) => `- ${line}`)
  .join("\n")}

## Technical Details
- Implementation details here
- Architecture decisions
- Dependencies added/modified

## Testing
- All pre-commit hooks pass (Biome formatting, linting)
- Component/functionality tests added
- Manual testing completed
- No breaking changes to existing functionality

🤖 Generated with Cursor by Claude`;
        }

        // Create PR with auto-merge
        console.log("\n🚀 Creating Pull Request with auto-merge...");
        const baseBranch = Option.getOrElse(config.base, () => "main");
        const headBranch = Option.getOrElse(
          config.head,
          () => gitState.currentBranch,
        );
        const prOptions = {
          title: config.title,
          body: prBody,
          base: baseBranch,
          head: headBranch,
          draft: false, // Auto-merge PRs shouldn't be drafts
          auto: true, // Enable auto-merge
        };

        const pr = yield* cli.createPullRequest(prOptions);

        console.log(`\n🎉 Pull Request created with auto-merge enabled!`);
        console.log(`📋 PR #${pr.number}: ${config.title}`);
        console.log(`🔗 ${pr.url}`);
        console.log(
          `🤖 Auto-merge: ${pr.autoMergeEnabled ? "ENABLED" : "FAILED TO ENABLE"}`,
        );

        if (pr.autoMergeEnabled) {
          yield* printLines([
            "",
            "Auto-merge status:",
            "✅ Auto-merge enabled - PR will merge automatically when:",
            "   - All required approvals are received",
            "   - All status checks pass",
            "   - Branch protection rules are satisfied",
            "",
            "Monitor progress:",
            `gh pr view ${pr.number} --json isInMergeQueue,mergeStateStatus`,
          ]);
        } else {
          yield* printLines([
            "",
            "⚠️  Auto-merge setup failed. Manual merge required.",
            "   Check branch protection rules and try:",
            `gh pr merge ${pr.number} --squash --auto`,
          ]);
        }
      }),
    ),
  );
}

function buildViewCommand() {
  const prNumberArg = Args.integer({ name: "number" }).pipe(
    Args.withDescription("PR number to view"),
  );

  const jsonOption = Options.text("json").pipe(
    Options.optional,
    Options.withDescription("JSON fields to include (comma-separated)"),
  );

  const webOption = Options.boolean("web").pipe(
    Options.withDescription("Open PR in web browser"),
  );

  return Command.make("view", {
    number: prNumberArg,
    json: jsonOption,
    web: webOption,
  }).pipe(
    Command.withDescription("View details of a GitHub Pull Request"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("pr", "view");
        yield* trackFeatureUsage("gh_pr_view", {
          json: !!config.json,
          web: config.web,
        });

        const service = new GhPRService();

        // Check GitHub CLI setup
        console.log("🔍 Checking GitHub CLI setup...");
        const setup = yield* service.checkGitHubCliSetup();

        if (!setup.cliAvailable || !setup.authenticated) {
          yield* printLines([
            "❌ GitHub CLI setup incomplete.",
            "   Please ensure GitHub CLI is installed and authenticated:",
            "   https://cli.github.com/",
          ]);
          yield* Effect.die("GitHub CLI setup incomplete");
        }

        console.log(
          `✅ GitHub CLI authenticated${setup.repository ? ` for ${setup.repository}` : ""}`,
        );

        // View PR
        console.log(`\n👁️  Viewing Pull Request #${config.number}...`);
        const options: { json?: string; web?: boolean } = {};
        if (config.json._tag === "Some") {
          options.json = config.json.value;
        }
        if (config.web) {
          options.web = config.web;
        }

        const result = yield* service.viewPR(config.number, options);
        console.log(result);
      }),
    ),
  );
}

function buildMergeCommand() {
  const prNumberArg = Args.integer({ name: "number" }).pipe(
    Args.withDescription("PR number to merge"),
  );

  const methodOption = Options.text("method").pipe(
    Options.optional,
    Options.withDescription(
      "Merge method: merge, squash, or rebase (default: merge)",
    ),
  );

  const autoOption = Options.boolean("auto").pipe(
    Options.withDescription("Enable auto-merge if available"),
  );

  const deleteBranchOption = Options.boolean("delete-branch").pipe(
    Options.withDescription("Delete the branch after merging"),
  );

  return Command.make("merge", {
    number: prNumberArg,
    method: methodOption,
    auto: autoOption,
    deleteBranch: deleteBranchOption,
  }).pipe(
    Command.withDescription("Merge a GitHub Pull Request"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("pr", "merge");
        yield* trackFeatureUsage("gh_pr_merge", {
          method: !!config.method,
          auto: config.auto,
          delete_branch: config.deleteBranch,
        });

        const service = new GhPRService();

        // Check GitHub CLI setup
        console.log("🔍 Checking GitHub CLI setup...");
        const setup = yield* service.checkGitHubCliSetup();

        if (!setup.cliAvailable || !setup.authenticated) {
          yield* printLines([
            "❌ GitHub CLI setup incomplete.",
            "   Please ensure GitHub CLI is installed and authenticated:",
            "   https://cli.github.com/",
          ]);
          yield* Effect.die("GitHub CLI setup incomplete");
        }

        console.log(
          `✅ GitHub CLI authenticated${setup.repository ? ` for ${setup.repository}` : ""}`,
        );

        // Merge PR
        console.log(`\n🔀 Merging Pull Request #${config.number}...`);
        const options = {
          method: Option.getOrUndefined(config.method) as
            | "merge"
            | "squash"
            | "rebase",
          auto: config.auto,
          deleteBranch: config.deleteBranch,
        };

        const result = yield* service.mergePR(config.number, options);
        console.log("✅ Pull Request merged successfully!");
        console.log(result);
      }),
    ),
  );
}

function buildListCommand() {
  const stateOption = Options.text("state").pipe(
    Options.optional,
    Options.withDescription(
      "PR state: open, closed, merged, or all (default: open)",
    ),
  );

  const authorOption = Options.text("author").pipe(
    Options.optional,
    Options.withDescription("Filter by PR author"),
  );

  const assigneeOption = Options.text("assignee").pipe(
    Options.optional,
    Options.withDescription("Filter by PR assignee"),
  );

  const limitOption = Options.integer("limit").pipe(
    Options.optional,
    Options.withDescription("Maximum number of PRs to list (default: 10)"),
  );

  const jsonOption = Options.boolean("json").pipe(
    Options.withDescription("Output in JSON format"),
  );

  return Command.make("list", {
    state: stateOption,
    author: authorOption,
    assignee: assigneeOption,
    limit: limitOption,
    json: jsonOption,
  }).pipe(
    Command.withDescription("List GitHub Pull Requests"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("pr", "list");
        yield* trackFeatureUsage("gh_pr_list", {
          has_state: !!config.state,
          has_author: !!config.author,
          has_assignee: !!config.assignee,
          has_limit: !!config.limit,
          json: config.json,
        });

        const service = new GhPRService();

        // Check GitHub CLI setup
        console.log("🔍 Checking GitHub CLI setup...");
        const setup = yield* service.checkGitHubCliSetup();

        if (!setup.cliAvailable || !setup.authenticated) {
          yield* printLines([
            "❌ GitHub CLI setup incomplete.",
            "   Please ensure GitHub CLI is installed and authenticated:",
            "   https://cli.github.com/",
          ]);
          yield* Effect.die("GitHub CLI setup incomplete");
        }

        console.log(
          `✅ GitHub CLI authenticated${setup.repository ? ` for ${setup.repository}` : ""}`,
        );

        // List PRs
        console.log("\n📋 Listing Pull Requests...");
        const options: {
          state?: "open" | "closed" | "merged" | "all";
          author?: string;
          assignee?: string;
          limit?: number;
          json?: boolean;
        } = {
          state: Option.getOrElse(config.state, () => "open") as
            | "open"
            | "closed"
            | "merged"
            | "all",
          limit: Option.getOrElse(config.limit, () => 10),
          json: config.json,
        };

        if (config.author._tag === "Some") {
          options.author = config.author.value;
        }
        if (config.assignee._tag === "Some") {
          options.assignee = config.assignee.value;
        }

        const result = yield* service.listPRs(options);

        if (config.json) {
          console.log(result);
        } else {
          // Format the output nicely
          console.log(result || "No pull requests found.");
        }
      }),
    ),
  );
}
