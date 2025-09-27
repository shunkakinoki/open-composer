import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as Effect from "effect/Effect";
import {
  createStackBranch,
  deleteStackBranch,
  logStack,
  runWithGitStack,
  statusStack,
  submitStack,
  trackStackBranch,
} from "../src/index.js";

// Test setup utilities
let testDir: string;
let originalCwd: string;

const setupTestRepo = async (): Promise<string> => {
  const testRepoDir = path.join(tmpdir(), `git-stack-test-${Date.now()}`);
  await mkdir(testRepoDir, { recursive: true });

  // Initialize git repo
  execSync("git init", { cwd: testRepoDir });
  execSync("git config user.name 'Test User'", { cwd: testRepoDir });
  execSync("git config user.email 'test@example.com'", { cwd: testRepoDir });

  // Create initial commit
  const readmePath = path.join(testRepoDir, "README.md");
  await Bun.write(readmePath, "# Test Repository");
  execSync("git add README.md", { cwd: testRepoDir });
  execSync('git commit -m "Initial commit"', { cwd: testRepoDir });

  return testRepoDir;
};

const cleanupTestRepo = async (repoDir: string): Promise<void> => {
  await rm(repoDir, { recursive: true, force: true });
};

describe("GitStack", () => {
  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await setupTestRepo();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestRepo(testDir);
  });

  test("log returns helpful message when stack is empty", async () => {
    process.chdir(testDir);
    const lines = await Effect.runPromise(runWithGitStack(logStack));
    expect(lines[0]).toContain("No tracked stack branches");
  });

  test("create branch and track it in stack", async () => {
    process.chdir(testDir);

    // Create a new feature branch
    const featureFile = path.join(testDir, "feature.txt");
    await Bun.write(featureFile, "Feature implementation");
    execSync("git add feature.txt", { cwd: testDir });
    execSync('git commit -m "feat: implement feature #12345"', {
      cwd: testDir,
    });

    // Create new branch from current
    const result = await Effect.runPromise(
      runWithGitStack(createStackBranch({ name: "feature-branch" })),
    );

    expect(result.branch).toBe("feature-branch");

    // Track the branch
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("feature-branch", "main")),
    );

    // Check submit shows the PR
    const submitLines = await Effect.runPromise(runWithGitStack(submitStack));
    expect(submitLines[0]).toContain(
      "feat: implement feature #12345 #12345 Open Composer",
    );
  });

  test("track multiple branches and show stack", async () => {
    process.chdir(testDir);

    // Create base feature branch
    execSync("git checkout -b base-feature", { cwd: testDir });
    const baseFile = path.join(testDir, "base.txt");
    await Bun.write(baseFile, "Base feature");
    execSync("git add base.txt", { cwd: testDir });
    execSync('git commit -m "feat: add base feature #12346"', { cwd: testDir });

    // Track base feature
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("base-feature", "main")),
    );

    // Create dependent feature
    execSync("git checkout -b dependent-feature", { cwd: testDir });
    const depFile = path.join(testDir, "dep.txt");
    await Bun.write(depFile, "Dependent feature");
    execSync("git add dep.txt", { cwd: testDir });
    execSync('git commit -m "feat: add dependent feature #12347"', {
      cwd: testDir,
    });

    // Track dependent feature
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("dependent-feature", "base-feature")),
    );

    // Check submit shows stacked PRs
    const submitLines = await Effect.runPromise(runWithGitStack(submitStack));
    expect(
      submitLines.some((line) =>
        line.includes("feat: add base feature #12346 #12346 Open Composer"),
      ),
    ).toBe(true);
    expect(
      submitLines.some((line) =>
        line.includes(
          "feat: add dependent feature #12347 #12347 Open Composer",
        ),
      ),
    ).toBe(true);
  });

  test("status shows current branch and relationships", async () => {
    process.chdir(testDir);

    // Create and track a branch
    execSync("git checkout -b test-branch", { cwd: testDir });
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("test-branch", "main")),
    );

    const status = await Effect.runPromise(runWithGitStack(statusStack));
    expect(status.currentBranch).toBe("test-branch");
  });

  test("untrack removes branch from stack", async () => {
    process.chdir(testDir);

    // Create and track a branch
    execSync("git checkout -b temp-branch", { cwd: testDir });

    // Create a commit on this branch
    const tempFile = path.join(testDir, "temp.txt");
    await Bun.write(tempFile, "Temporary feature");
    execSync("git add temp.txt", { cwd: testDir });
    execSync('git commit -m "feat: add temporary feature #99999"', {
      cwd: testDir,
    });

    await Effect.runPromise(
      runWithGitStack(trackStackBranch("temp-branch", "main")),
    );

    // Verify it's tracked (should not show "No tracked stack branches")
    let submitLines = await Effect.runPromise(runWithGitStack(submitStack));
    expect(submitLines[0]).not.toContain("No tracked stack branches");
    expect(submitLines.some((line) => line.includes("#99999"))).toBe(true);

    // Switch to main branch first
    execSync("git checkout main", { cwd: testDir });

    // Delete the branch from stack (force delete since it's not merged)
    await Effect.runPromise(
      runWithGitStack(deleteStackBranch("temp-branch", true)),
    );

    // Verify it's no longer tracked (#99999 should not appear)
    submitLines = await Effect.runPromise(runWithGitStack(submitStack));
    expect(submitLines.some((line) => line.includes("#99999"))).toBe(false);
  });

  test("log shows tracked branches", async () => {
    process.chdir(testDir);

    // Create and track multiple branches
    execSync("git checkout -b branch1", { cwd: testDir });
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("branch1", "main")),
    );

    execSync("git checkout -b branch2", { cwd: testDir });
    await Effect.runPromise(
      runWithGitStack(trackStackBranch("branch2", "branch1")),
    );

    const logLines = await Effect.runPromise(runWithGitStack(logStack));
    expect(logLines.some((line) => line.includes("branch1"))).toBe(true);
    expect(logLines.some((line) => line.includes("branch2"))).toBe(true);
  });
});
