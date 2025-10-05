import { describe, expect, it } from "bun:test";
import { AgentFactory } from "../agent-factory.js";
import { LLMTask, type OpenComposerAgent } from "../types.js";

describe("AgentFactory", () => {
  describe("createAgent", () => {
    it("should create an agent with correct tier for haiku model", () => {
      const agent = AgentFactory.createAgent(
        "claude-3-5-haiku-latest",
        "anthropic",
        [LLMTask.ROUTER],
      );

      expect(agent.tier).toBe("starter");
      expect(agent.provider).toBe("anthropic");
      expect(agent.modelName).toBe("claude-3-5-haiku-latest");
    });

    it("should create an agent with correct tier for sonnet model", () => {
      const agent = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.PROGRAMMER],
      );

      expect(agent.tier).toBe("evolved");
    });

    it("should create an agent with correct tier for opus model", () => {
      const agent = AgentFactory.createAgent(
        "claude-opus-4-0",
        "anthropic",
        [LLMTask.PLANNER],
      );

      expect(agent.tier).toBe("legendary");
    });

    it("should create an agent with Pokemon attributes", () => {
      const agent = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.PROGRAMMER],
      );

      expect(agent.pokemonAttributes).toBeDefined();
      expect(agent.pokemonAttributes.sprite).toBe("🤖");
      expect(agent.pokemonAttributes.stats).toBeDefined();
      expect(agent.pokemonAttributes.stats.speed).toBeGreaterThanOrEqual(0);
      expect(agent.pokemonAttributes.stats.speed).toBeLessThanOrEqual(100);
    });

    it("should create an agent with correct task specializations", () => {
      const tasks = [LLMTask.PLANNER, LLMTask.PROGRAMMER];
      const agent = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        tasks,
      );

      expect(agent.taskSpecializations).toEqual(tasks);
      expect(agent.compatibility.supportedTasks).toEqual(tasks);
    });

    it("should create an agent with thinking support for o1 models", () => {
      const agent = AgentFactory.createAgent("o1-preview", "openai", [
        LLMTask.PROGRAMMER,
      ]);

      expect(agent.compatibility.supportsThinking).toBe(true);
    });

    it("should create an agent with custom name", () => {
      const customName = "My Custom Agent";
      const agent = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.PROGRAMMER],
        customName,
      );

      expect(agent.name).toBe(customName);
    });
  });

  describe("createDefaultAgents", () => {
    it("should create default agents", () => {
      const agents = AgentFactory.createDefaultAgents();

      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every((agent: OpenComposerAgent) => agent.id)).toBe(true);
      expect(agents.every((agent: OpenComposerAgent) => agent.provider)).toBe(
        true,
      );
      expect(agents.every((agent: OpenComposerAgent) => agent.tier)).toBe(
        true,
      );
    });

    it("should create agents from all providers", () => {
      const agents = AgentFactory.createDefaultAgents();
      const providers = new Set(agents.map((a: OpenComposerAgent) => a.provider));

      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("google-genai")).toBe(true);
    });

    it("should create agents for all tiers", () => {
      const agents = AgentFactory.createDefaultAgents();
      const tiers = new Set(agents.map((a: OpenComposerAgent) => a.tier));

      expect(tiers.has("starter")).toBe(true);
      expect(tiers.has("evolved")).toBe(true);
    });
  });

  describe("agent stats", () => {
    it("should calculate higher speed for haiku models", () => {
      const haiku = AgentFactory.createAgent(
        "claude-3-5-haiku-latest",
        "anthropic",
        [LLMTask.ROUTER],
      );
      const sonnet = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.ROUTER],
      );

      expect(haiku.pokemonAttributes.stats.speed).toBeGreaterThan(
        sonnet.pokemonAttributes.stats.speed,
      );
    });

    it("should calculate higher power for opus models", () => {
      const opus = AgentFactory.createAgent("claude-opus-4-0", "anthropic", [
        LLMTask.PROGRAMMER,
      ]);
      const sonnet = AgentFactory.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.PROGRAMMER],
      );

      expect(opus.pokemonAttributes.stats.power).toBeGreaterThan(
        sonnet.pokemonAttributes.stats.power,
      );
    });
  });
});
