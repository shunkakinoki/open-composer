import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as Effect from "effect/Effect";
import type { GitCommandError } from "@open-composer/git";
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

// Helper to run effects that can fail and extract the value
const runEffect = async <A>(
  effect: Effect.Effect<A, GitCommandError>,
): Promise<A> => {
  return Effect.runPromise(effect);
};

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
    const lines = await runEffect(runWithGitStack(logStack));
    expect(lines[0]).toContain("No tracked stack branches");
  });

  test("create branch and track it in stack", async () => {
    process.chdir(testDir);

    // Get the initial branch name for tracking
    const branchesOutput1 = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranch1 = branchesOutput1
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Create a new feature branch
    const featureFile = path.join(testDir, "feature.txt");
    await Bun.write(featureFile, "Feature implementation");
    execSync("git add feature.txt", { cwd: testDir });
    execSync('git commit -m "feat: implement feature #12345"', {
      cwd: testDir,
    });

    // Create new branch from current
    const result = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(createStackBranch({ name: "feature-branch" })),
    );

    expect(result.branch).toBe("feature-branch");

    // Track the branch
    await runEffect(
      runWithGitStack(trackStackBranch("feature-branch", initialBranch1)),
    );

    // Check submit shows the PR
    const submitLines = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(submitStack),
    );
    expect(submitLines[0]).toContain(
      "feat: implement feature #12345 #12345 Open Composer",
    );
  });

  test("track multiple branches and show stack", async () => {
    process.chdir(testDir);

    // Get the initial branch name for tracking
    const branchesOutput2 = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranch2 = branchesOutput2
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Create base feature branch
    execSync("git checkout -b base-feature", { cwd: testDir });
    const baseFile = path.join(testDir, "base.txt");
    await Bun.write(baseFile, "Base feature");
    execSync("git add base.txt", { cwd: testDir });
    execSync('git commit -m "feat: add base feature #12346"', { cwd: testDir });

    // Track base feature
    await runEffect(
      runWithGitStack(trackStackBranch("base-feature", initialBranch2)),
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
    await runEffect(
      runWithGitStack(trackStackBranch("dependent-feature", "base-feature")),
    );

    // Check submit shows stacked PRs
    const submitLines = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(submitStack),
    );
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

    // Get the initial branch name for tracking
    const branchesOutput3 = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranch3 = branchesOutput3
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Create and track a branch
    execSync("git checkout -b test-branch", { cwd: testDir });
    await runEffect(
      runWithGitStack(trackStackBranch("test-branch", initialBranch3)),
    );

    const status = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(statusStack),
    );
    expect(status.currentBranch).toBe("test-branch");
  });

  test("untrack removes branch from stack", async () => {
    process.chdir(testDir);

    // Get the initial branch name for tracking
    const branchesOutput4 = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranch4 = branchesOutput4
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Create and track a branch
    execSync("git checkout -b temp-branch", { cwd: testDir });

    // Create a commit on this branch
    const tempFile = path.join(testDir, "temp.txt");
    await Bun.write(tempFile, "Temporary feature");
    execSync("git add temp.txt", { cwd: testDir });
    execSync('git commit -m "feat: add temporary feature #99999"', {
      cwd: testDir,
    });

    await runEffect(
      runWithGitStack(trackStackBranch("temp-branch", initialBranch4)),
    );

    // Verify it's tracked (should not show "No tracked stack branches")
    let submitLines = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(submitStack),
    );
    expect(submitLines[0]).not.toContain("No tracked stack branches");
    expect(submitLines.some((line) => line.includes("#99999"))).toBe(true);

    // Get the initial branch name (the first branch created)
    const branchesOutput = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranchName = branchesOutput
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Switch back to the initial branch
    execSync(`git checkout ${initialBranchName}`, { cwd: testDir });

    // Delete the branch from stack (force delete since it's not merged)
    await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(deleteStackBranch("temp-branch", true)),
    );

    // Verify it's no longer tracked (#99999 should not appear)
    submitLines = await runEffect(
      // @ts-expect-error - TypeScript is incorrectly inferring the error type
      runWithGitStack(submitStack),
    );
    expect(submitLines.some((line) => line.includes("#99999"))).toBe(false);
  });

  test("log shows tracked branches", async () => {
    process.chdir(testDir);

    // Get the initial branch name for tracking
    const branchesOutput5 = execSync("git branch", {
      cwd: testDir,
      encoding: "utf8",
    });
    const initialBranch5 = branchesOutput5
      .split("\n")[0]
      .trim()
      .replace("*", "")
      .trim();

    // Create and track multiple branches
    execSync("git checkout -b branch1", { cwd: testDir });
    await runEffect(
      runWithGitStack(trackStackBranch("branch1", initialBranch5)),
    );

    execSync("git checkout -b branch2", { cwd: testDir });
    await runEffect(runWithGitStack(trackStackBranch("branch2", "branch1")));

    const logLines = await runEffect(runWithGitStack(logStack));
    expect(logLines.some((line) => line.includes("branch1"))).toBe(true);
    expect(logLines.some((line) => line.includes("branch2"))).toBe(true);
  });
});
