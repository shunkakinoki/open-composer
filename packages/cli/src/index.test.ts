import { describe, expect, test } from "bun:test";
import { AgentRouter, WorktreeManager } from "./lib/index.js";

describe("Open Composer CLI", () => {
  describe("AgentRouter", () => {
    test("should initialize with default agents", () => {
      const router = new AgentRouter();
      const agents = router.getAgents();

      expect(agents).toHaveLength(5);
      expect(agents.find((a) => a.name === "claude-code")).toBeDefined();
      expect(agents.find((a) => a.name === "codex-nation")).toBeDefined();
    });

    test("should activate and deactivate agents", () => {
      const router = new AgentRouter();

      expect(router.activateAgent("codex-nation")).toBe(true);
      expect(router.deactivateAgent("claude-code")).toBe(true);

      const activeAgents = router.getActiveAgents();
      expect(activeAgents.find((a) => a.name === "codex-nation")).toBeDefined();
      expect(
        activeAgents.find((a) => a.name === "claude-code"),
      ).toBeUndefined();
    });

    test("should route queries to appropriate agents", async () => {
      const router = new AgentRouter();

      const reviewResponse = await router.routeQuery("review this code");
      expect(reviewResponse.agent).toBe("claude-code");

      const generateResponse = await router.routeQuery("generate a function");
      expect(generateResponse.agent).toBe("codex-nation");
    });
  });

  describe("WorktreeManager", () => {
    test("should initialize with current directory", () => {
      const manager = new WorktreeManager();
      expect(manager).toBeDefined();
    });

    test("should get current branch", async () => {
      const manager = new WorktreeManager();
      const branch = await manager.getCurrentBranch();
      expect(typeof branch).toBe("string");
    });
  });
});
