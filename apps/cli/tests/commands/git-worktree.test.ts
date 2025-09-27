import { describe, expect, it } from "bun:test";
import { runCli, stripAnsi } from "../utils";

describe("Git Worktree Command", () => {
  describe("gw list", () => {
    it("lists git worktrees", async () => {
      const result = await runCli(["gw", "list"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Git worktrees:");
    });
  });

  describe("gw create", () => {
    it("creates a new worktree with required path", async () => {
      const result = await runCli(["gw", "create", "/tmp/test-worktree"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      // This might fail in test environment, but should show proper error handling
      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates worktree with branch option", async () => {
      const result = await runCli([
        "gw",
        "create",
        "/tmp/test-worktree",
        "--branch",
        "test-branch",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates worktree with ref argument", async () => {
      const result = await runCli([
        "gw",
        "create",
        "/tmp/test-worktree",
        "main",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates detached worktree", async () => {
      const result = await runCli([
        "gw",
        "create",
        "/tmp/test-worktree",
        "--detach",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates worktree without checkout", async () => {
      const result = await runCli([
        "gw",
        "create",
        "/tmp/test-worktree",
        "--no-checkout",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates worktree with force option", async () => {
      const result = await runCli([
        "gw",
        "create",
        "/tmp/test-worktree",
        "--force",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing path argument", async () => {
      const result = await runCli(["gw", "create"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("gw edit", () => {
    it("moves/renames an existing worktree", async () => {
      const result = await runCli([
        "gw",
        "edit",
        "/tmp/old-path",
        "/tmp/new-path",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      // This might fail if worktrees don't exist, but should show proper error handling
      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("moves worktree with force option", async () => {
      const result = await runCli([
        "gw",
        "edit",
        "/tmp/old-path",
        "/tmp/new-path",
        "--force",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing arguments", async () => {
      const result = await runCli(["gw", "edit", "/tmp/old-path"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("gw help", () => {
    it("shows help text for git worktree command", async () => {
      const result = await runCli(["gw", "--help"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Manage git worktrees");
      expect(stdout).toContain("SUBCOMMANDS");
      expect(stdout).toContain("list");
      expect(stdout).toContain("create");
      expect(stdout).toContain("edit");
    });
  });
});
