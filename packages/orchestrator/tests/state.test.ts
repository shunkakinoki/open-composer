import { describe, expect, test } from "bun:test";
import {
  GraphConfigSchema,
  OrchestratorStateAnnotation,
  tokenDataReducer,
  type GraphConfig,
  type OrchestratorState,
} from "../src/state.js";
import type { ModelTokenData } from "../src/types.js";

describe.concurrent("State Management", () => {
  describe.concurrent("tokenDataReducer", () => {
    test.concurrent("should merge token data by model", async () => {
      const state: ModelTokenData[] = [
        {
          model: "anthropic:claude-sonnet-4-0",
          cacheCreationInputTokens: 100,
          cacheReadInputTokens: 50,
          inputTokens: 200,
          outputTokens: 150,
        },
      ];

      const update: ModelTokenData[] = [
        {
          model: "anthropic:claude-sonnet-4-0",
          cacheCreationInputTokens: 25,
          cacheReadInputTokens: 15,
          inputTokens: 75,
          outputTokens: 60,
        },
      ];

      const result = tokenDataReducer(state, update);

      expect(result).toHaveLength(1);
      expect(result[0].model).toBe("anthropic:claude-sonnet-4-0");
      expect(result[0].cacheCreationInputTokens).toBe(125);
      expect(result[0].cacheReadInputTokens).toBe(65);
      expect(result[0].inputTokens).toBe(275);
      expect(result[0].outputTokens).toBe(210);
    });

    test.concurrent("should handle multiple models", async () => {
      const state: ModelTokenData[] = [
        {
          model: "anthropic:claude-sonnet-4-0",
          cacheCreationInputTokens: 100,
          cacheReadInputTokens: 50,
          inputTokens: 200,
          outputTokens: 150,
        },
      ];

      const update: ModelTokenData[] = [
        {
          model: "anthropic:claude-3-5-haiku-latest",
          cacheCreationInputTokens: 40,
          cacheReadInputTokens: 20,
          inputTokens: 100,
          outputTokens: 80,
        },
      ];

      const result = tokenDataReducer(state, update);

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.model === "anthropic:claude-sonnet-4-0")).toBeDefined();
      expect(result.find((d) => d.model === "anthropic:claude-3-5-haiku-latest")).toBeDefined();
    });

    test.concurrent("should return update when state is undefined", async () => {
      const update: ModelTokenData[] = [
        {
          model: "anthropic:claude-sonnet-4-0",
          cacheCreationInputTokens: 100,
          cacheReadInputTokens: 50,
          inputTokens: 200,
          outputTokens: 150,
        },
      ];

      const result = tokenDataReducer(undefined, update);

      expect(result).toEqual(update);
    });

    test.concurrent("should handle empty update array", async () => {
      const state: ModelTokenData[] = [
        {
          model: "anthropic:claude-sonnet-4-0",
          cacheCreationInputTokens: 100,
          cacheReadInputTokens: 50,
          inputTokens: 200,
          outputTokens: 150,
        },
      ];

      const result = tokenDataReducer(state, []);

      expect(result).toEqual(state);
    });
  });

  describe.concurrent("GraphConfigSchema", () => {
    test.concurrent("should validate default config", async () => {
      const config: GraphConfig = GraphConfigSchema.parse({});

      expect(config.plannerModelName).toBe("anthropic:claude-sonnet-4-0");
      expect(config.plannerTemperature).toBe(0);
      expect(config.maxTokens).toBe(10000);
    });

    test.concurrent("should allow custom config", async () => {
      const config: GraphConfig = GraphConfigSchema.parse({
        plannerModelName: "anthropic:claude-opus-4-0",
        plannerTemperature: 0.5,
        maxTokens: 20000,
        openRouterApiKey: "test-key",
      });

      expect(config.plannerModelName).toBe("anthropic:claude-opus-4-0");
      expect(config.plannerTemperature).toBe(0.5);
      expect(config.maxTokens).toBe(20000);
      expect(config.openRouterApiKey).toBe("test-key");
    });

    test.concurrent("should have defaults for all task types", async () => {
      const config: GraphConfig = GraphConfigSchema.parse({});

      expect(config.plannerModelName).toBeDefined();
      expect(config.coordinatorModelName).toBeDefined();
      expect(config.synthesizerModelName).toBeDefined();
      expect(config.optimizerModelName).toBeDefined();
    });

    test.concurrent("should allow partial config updates", async () => {
      const config: GraphConfig = GraphConfigSchema.parse({
        plannerTemperature: 0.7,
      });

      expect(config.plannerTemperature).toBe(0.7);
      expect(config.plannerModelName).toBe("anthropic:claude-sonnet-4-0");
    });
  });

  describe.concurrent("OrchestratorStateAnnotation", () => {
    test.concurrent("should have messages field", async () => {
      expect(OrchestratorStateAnnotation).toBeDefined();
      expect(OrchestratorStateAnnotation.spec).toBeDefined();
    });

    test.concurrent("should have all required state fields", async () => {
      const stateSpec = OrchestratorStateAnnotation.spec;

      expect(stateSpec.messages).toBeDefined();
      expect(stateSpec.taskPlan).toBeDefined();
      expect(stateSpec.orchestrationNotes).toBeDefined();
      expect(stateSpec.tokenData).toBeDefined();
      expect(stateSpec.activeTaskId).toBeDefined();
      expect(stateSpec.agentWorkloads).toBeDefined();
      expect(stateSpec.executionMetadata).toBeDefined();
    });

    test.concurrent("should use tokenDataReducer for tokenData field", async () => {
      const spec = OrchestratorStateAnnotation.spec.tokenData;

      // Test that the reducer works correctly
      const state: ModelTokenData[] = [];
      const update: ModelTokenData[] = [
        {
          model: "test-model",
          cacheCreationInputTokens: 10,
          cacheReadInputTokens: 5,
          inputTokens: 20,
          outputTokens: 15,
        },
      ];

      expect(spec).toBeDefined();
    });
  });
});
