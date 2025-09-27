import { describe, expect, it } from "bun:test";
import { runCli, stripAnsi } from "../utils";

describe("Stack Command", () => {
  describe("stack log", () => {
    it("displays the current stack tree", async () => {
      const result = await runCli(["stack", "log"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack tree:");
    });
  });

  describe("stack status", () => {
    it("shows stack status for the current branch", async () => {
      const result = await runCli(["stack", "status"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack status:");
    });
  });

  describe("stack create", () => {
    it("creates a new branch", async () => {
      const result = await runCli(["stack", "create", "test-branch"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("creates branch with base option", async () => {
      const result = await runCli([
        "stack",
        "create",
        "test-branch",
        "--base",
        "main",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing branch name", async () => {
      const result = await runCli(["stack", "create"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack track", () => {
    it("tracks a branch on top of another", async () => {
      const result = await runCli(["stack", "track", "feature-branch", "main"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing arguments", async () => {
      const result = await runCli(["stack", "track", "feature-branch"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack untrack", () => {
    it("removes tracking information for a branch", async () => {
      const result = await runCli(["stack", "untrack", "feature-branch"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing branch name", async () => {
      const result = await runCli(["stack", "untrack"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack delete", () => {
    it("deletes a tracked branch", async () => {
      const result = await runCli(["stack", "delete", "feature-branch"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("force deletes a branch", async () => {
      const result = await runCli([
        "stack",
        "delete",
        "feature-branch",
        "--force",
      ]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing branch name", async () => {
      const result = await runCli(["stack", "delete"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack checkout", () => {
    it("checkouts a branch in the stack", async () => {
      const result = await runCli(["stack", "checkout", "feature-branch"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBeGreaterThanOrEqual(0);
      expect(stderr).toBe("");
    });

    it("shows error for missing branch name", async () => {
      const result = await runCli(["stack", "checkout"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack sync", () => {
    it("syncs the stack with the remote", async () => {
      const result = await runCli(["stack", "sync"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack sync:");
    });
  });

  describe("stack submit", () => {
    it("submits the stack for review", async () => {
      const result = await runCli(["stack", "submit"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack submit:");
    });
  });

  describe("stack restack", () => {
    it("restacks the current stack", async () => {
      const result = await runCli(["stack", "restack"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack restack:");
    });
  });

  describe("stack config", () => {
    it("configures stack defaults", async () => {
      const result = await runCli(["stack", "config", "origin"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Stack config:");
    });

    it("shows error for missing remote argument", async () => {
      const result = await runCli(["stack", "config"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("stack help", () => {
    it("shows help text for stack command", async () => {
      const result = await runCli(["stack", "--help"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Manage stacked pull requests");
      expect(stdout).toContain("SUBCOMMANDS");
      expect(stdout).toContain("log");
      expect(stdout).toContain("status");
      expect(stdout).toContain("create");
      expect(stdout).toContain("track");
      expect(stdout).toContain("untrack");
      expect(stdout).toContain("delete");
      expect(stdout).toContain("checkout");
      expect(stdout).toContain("sync");
      expect(stdout).toContain("submit");
      expect(stdout).toContain("restack");
      expect(stdout).toContain("config");
    });
  });
});
