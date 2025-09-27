import { describe, expect, it } from "bun:test";
import { runCli, stripAnsi } from "../utils";

describe("Agents Command", () => {
  describe("agents list", () => {
    it("lists available agents", async () => {
      const result = await runCli(["agents", "list"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Agents:");
    });

    it("lists only active agents when --active flag is provided", async () => {
      const result = await runCli(["agents", "list", "--active"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Agents:");
    });
  });

  describe("agents activate", () => {
    it("activates an agent", async () => {
      const result = await runCli(["agents", "activate", "test-agent"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Agent activated:");
    });

    it("shows error for missing agent name", async () => {
      const result = await runCli(["agents", "activate"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("agents deactivate", () => {
    it("deactivates an agent", async () => {
      const result = await runCli(["agents", "deactivate", "test-agent"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Agent deactivated:");
    });

    it("shows error for missing agent name", async () => {
      const result = await runCli(["agents", "deactivate"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("agents route", () => {
    it("routes a query through the agent router", async () => {
      const result = await runCli(["agents", "route", "test query"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Routing:");
    });

    it("routes with explicit agent", async () => {
      const result = await runCli([
        "agents",
        "route",
        "test query",
        "--agent",
        "test-agent",
      ]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Routing:");
    });

    it("routes with CLI path", async () => {
      const result = await runCli([
        "agents",
        "route",
        "test query",
        "--path",
        "command,subcommand",
      ]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Routing:");
    });

    it("shows error for missing query", async () => {
      const result = await runCli(["agents", "route"]);
      const _stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).not.toBe(0);
      expect(stderr).toContain("Missing required argument");
    });
  });

  describe("agents help", () => {
    it("shows help text for agents command", async () => {
      const result = await runCli(["agents", "--help"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Manage AI agents");
      expect(stdout).toContain("SUBCOMMANDS");
      expect(stdout).toContain("list");
      expect(stdout).toContain("activate");
      expect(stdout).toContain("deactivate");
      expect(stdout).toContain("route");
    });
  });
});
