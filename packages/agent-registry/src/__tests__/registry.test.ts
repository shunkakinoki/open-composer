import { describe, expect, it, beforeEach } from "bun:test";
import { AgentRegistry } from "../registry.js";
import { AgentFactory } from "../agent-factory.js";
import { LLMTask, type OpenComposerAgent } from "../types.js";

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe("initialization", () => {
    it("should initialize with default agents", () => {
      const agents = registry.getAllAgents();
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe("registerAgent", () => {
    it("should register a new agent", () => {
      const agent = AgentFactory.createAgent(
        "custom-model",
        "anthropic",
        [LLMTask.PROGRAMMER],
        "Custom Agent",
      );

      registry.registerAgent(agent);
      const retrieved = registry.getAgent(agent.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(agent.id);
    });

    it("should validate agent schema", () => {
      const invalidAgent = {
        id: "invalid",
        // Missing required fields
      };

      expect(() => registry.registerAgent(invalidAgent as OpenComposerAgent)).toThrow();
    });
  });

  describe("getAgent", () => {
    it("should get agent by id", () => {
      const agents = registry.getAllAgents();
      const firstAgent = agents[0];

      const retrieved = registry.getAgent(firstAgent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstAgent.id);
    });

    it("should return undefined for non-existent agent", () => {
      const retrieved = registry.getAgent("non-existent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAgentsByTask", () => {
    it("should get agents by task specialization", () => {
      const programmers = registry.getAgentsByTask(LLMTask.PROGRAMMER);

      expect(programmers.length).toBeGreaterThan(0);
      expect(
        programmers.every((agent: OpenComposerAgent) =>
          agent.taskSpecializations.includes(LLMTask.PROGRAMMER),
        ),
      ).toBe(true);
    });
  });

  describe("getAgentsByProvider", () => {
    it("should get agents by provider", () => {
      const anthropicAgents = registry.getAgentsByProvider("anthropic");

      expect(anthropicAgents.length).toBeGreaterThan(0);
      expect(
        anthropicAgents.every(
          (agent: OpenComposerAgent) => agent.provider === "anthropic",
        ),
      ).toBe(true);
    });
  });

  describe("getAgentsByTier", () => {
    it("should get agents by tier", () => {
      const starterAgents = registry.getAgentsByTier("starter");

      expect(
        starterAgents.every(
          (agent: OpenComposerAgent) => agent.tier === "starter",
        ),
      ).toBe(true);
    });
  });

  describe("createTeam", () => {
    it("should create a team with valid agents", () => {
      const agents = registry.getAllAgents();
      const agentIds = agents.slice(0, 3).map((a: OpenComposerAgent) => a.id);

      const team = registry.createTeam(
        "Test Team",
        "A test team",
        agentIds,
        {
          maxConcurrent: 2,
          fallbackEnabled: true,
          taskDistribution: "specialized",
        },
      );

      expect(team.id).toBeDefined();
      expect(team.name).toBe("Test Team");
      expect(team.agents.length).toBe(3);
      expect(team.config?.maxConcurrent).toBe(2);
    });

    it("should throw error when no valid agents found", () => {
      expect(() =>
        registry.createTeam("Empty Team", "Description", ["invalid-id"]),
      ).toThrow();
    });
  });

  describe("createSquad", () => {
    it("should create a squad from config", () => {
      const agents = registry.getAllAgents();
      const agentIds = agents.slice(0, 2).map((a: OpenComposerAgent) => a.id);

      const squad = registry.createSquad({
        name: "Quick Squad",
        description: "A quick squad",
        agentIds,
        taskDistribution: "balanced",
        maxConcurrent: 3,
        fallbackEnabled: true,
      });

      expect(squad.id).toBeDefined();
      expect(squad.name).toBe("Quick Squad");
      expect(squad.agents.length).toBe(2);
      expect(squad.config?.taskDistribution).toBe("balanced");
    });
  });

  describe("updateAgentPerformance", () => {
    it("should update agent performance metrics", () => {
      const agents = registry.getAllAgents();
      const agentId = agents[0].id;

      registry.updateAgentPerformance(agentId, {
        tokensUsed: 1000,
        success: true,
        latency: 500,
      });

      const agent = registry.getAgent(agentId);
      expect(agent?.performance.totalTokensUsed).toBe(1000);
      expect(agent?.performance.totalRequests).toBe(1);
      expect(agent?.performance.successRate).toBe(100);
      expect(agent?.performance.averageLatency).toBe(500);
    });

    it("should calculate success rate correctly", () => {
      const agents = registry.getAllAgents();
      const agentId = agents[0].id;

      registry.updateAgentPerformance(agentId, {
        tokensUsed: 100,
        success: true,
        latency: 100,
      });

      registry.updateAgentPerformance(agentId, {
        tokensUsed: 100,
        success: false,
        latency: 100,
      });

      const agent = registry.getAgent(agentId);
      expect(agent?.performance.successRate).toBe(50);
    });

    it("should throw error for non-existent agent", () => {
      expect(() =>
        registry.updateAgentPerformance("invalid-id", {
          tokensUsed: 100,
          success: true,
          latency: 100,
        }),
      ).toThrow();
    });
  });

  describe("removeAgent", () => {
    it("should remove an agent", () => {
      const agent = AgentFactory.createAgent(
        "test-model",
        "anthropic",
        [LLMTask.PROGRAMMER],
      );
      registry.registerAgent(agent);

      const removed = registry.removeAgent(agent.id);
      expect(removed).toBe(true);

      const retrieved = registry.getAgent(agent.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return registry statistics", () => {
      const stats = registry.getStats();

      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.totalTeams).toBeGreaterThanOrEqual(0);
      expect(stats.tierCounts).toBeDefined();
      expect(stats.providerCounts).toBeDefined();
    });

    it("should calculate average success rate", () => {
      const agents = registry.getAllAgents();
      const agentId = agents[0].id;

      registry.updateAgentPerformance(agentId, {
        tokensUsed: 100,
        success: true,
        latency: 100,
      });

      const stats = registry.getStats();
      expect(stats.averageSuccessRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clear", () => {
    it("should clear all agents and teams", () => {
      registry.clear();

      const agents = registry.getAllAgents();
      const teams = registry.getAllTeams();

      expect(agents.length).toBe(0);
      expect(teams.length).toBe(0);
    });
  });
});
