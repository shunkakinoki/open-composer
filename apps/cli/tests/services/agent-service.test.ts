import { describe, expect, it, mock, spyOn } from "bun:test";
import * as Effect from "effect/Effect";
import { AgentService } from "../../src/services/agent-service.js";

// Mock console.log to capture output
const mockConsoleLog = spyOn(console, "log");

// Mock agent router to return some test agents
mock.module("@open-composer/agent-router", () => {
  const { Effect } = require("effect");

  return {
    getAgents: Effect.succeed([
      {
        name: "claude-code",
        icon: "🤖",
        role: "Code assistant powered by Claude",
        active: true,
      },
      {
        name: "codex",
        icon: "📚",
        role: "Code generation specialist",
        active: false,
      },
      {
        name: "test",
        icon: "🤖",
        role: "Test agent",
        active: true,
      },
    ]),
    getActiveAgents: Effect.succeed([
      {
        name: "claude-code",
        icon: "🤖",
        role: "Code assistant powered by Claude",
        active: true,
      },
      {
        name: "test",
        icon: "🤖",
        role: "Test agent",
        active: true,
      },
    ]),
    activateAgent: (name: string) =>
      Effect.succeed(name === "claude-code" || name === "test"),
    deactivateAgent: (name: string) =>
      Effect.succeed(name === "claude-code" || name === "test"),
    routeQuery: () =>
      Effect.succeed({
        agent: "claude-code",
        content: "Mock response",
        timestamp: new Date(),
        success: true,
      }),
  };
});

describe("AgentService", () => {
  describe("list", () => {
    it("should list all agents when activeOnly is false", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(
        service.list({ activeOnly: false }),
      );

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output contains expected agents
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Agents:");
      expect(calls).toContain(
        "* claude-code     Code assistant powered by Claude",
      );
      expect(calls).toContain("  codex           Code generation specialist");
      expect(calls).toContain("* test            Test agent");
    });

    it("should list only active agents when activeOnly is true", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(
        service.list({ activeOnly: true }),
      );

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output contains only active agents
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Active agents:");
      expect(calls).toContain(
        "* claude-code     Code assistant powered by Claude",
      );
      expect(calls).toContain("* test            Test agent");
      expect(calls).not.toContain(
        "  codex           Code generation specialist",
      );
    });
  });

  describe("activate", () => {
    it("should activate an agent", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(service.activate("claude-code"));

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Activated agent: claude-code");
    });

    it("should handle agent not found", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(service.activate("nonexistent"));

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Agent not found: nonexistent");
    });
  });

  describe("deactivate", () => {
    it("should deactivate an agent", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(service.deactivate("claude-code"));

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Deactivated agent: claude-code");
    });

    it("should handle agent not found", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(service.deactivate("nonexistent"));

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Agent not found: nonexistent");
    });
  });

  describe("route", () => {
    it("should route a query", async () => {
      mockConsoleLog.mockClear();
      const service = new AgentService(["open-composer"]);

      const result = await Effect.runPromise(
        service.route({ query: "test query" }),
      );

      // The effect should complete without error
      expect(result).toBeUndefined();

      // Verify the output
      const calls = mockConsoleLog.mock.calls.map((call) => call[0]);
      expect(calls).toContain("Agent: claude-code");
      expect(calls).toContain("Response: Mock response");
      expect(calls).toContain("Success: yes");
    });
  });
});
