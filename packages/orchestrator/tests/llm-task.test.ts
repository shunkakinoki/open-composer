import { describe, expect, test } from "bun:test";
import {
  LLMTask,
  TASK_TO_CONFIG_DEFAULTS_MAP,
  getTaskConfigKey,
} from "../src/llm-task.js";

describe.concurrent("LLM Task", () => {
  test.concurrent("LLMTask enum should have all task types", async () => {
    expect(LLMTask.PLANNER).toBe("planner");
    expect(LLMTask.COORDINATOR).toBe("coordinator");
    expect(LLMTask.SYNTHESIZER).toBe("synthesizer");
    expect(LLMTask.OPTIMIZER).toBe("optimizer");
  });

  test.concurrent("TASK_TO_CONFIG_DEFAULTS_MAP should have defaults for all tasks", async () => {
    expect(TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.PLANNER]).toBeDefined();
    expect(TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.COORDINATOR]).toBeDefined();
    expect(TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.SYNTHESIZER]).toBeDefined();
    expect(TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.OPTIMIZER]).toBeDefined();
  });

  test.concurrent("PLANNER should use Claude Sonnet 4", async () => {
    const config = TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.PLANNER];
    expect(config.modelName).toBe("anthropic:claude-sonnet-4-0");
    expect(config.temperature).toBe(0);
  });

  test.concurrent("COORDINATOR should use Claude Sonnet 4", async () => {
    const config = TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.COORDINATOR];
    expect(config.modelName).toBe("anthropic:claude-sonnet-4-0");
    expect(config.temperature).toBe(0);
  });

  test.concurrent("SYNTHESIZER should use Claude Sonnet 4", async () => {
    const config = TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.SYNTHESIZER];
    expect(config.modelName).toBe("anthropic:claude-sonnet-4-0");
    expect(config.temperature).toBe(0);
  });

  test.concurrent("OPTIMIZER should use Claude Haiku", async () => {
    const config = TASK_TO_CONFIG_DEFAULTS_MAP[LLMTask.OPTIMIZER];
    expect(config.modelName).toBe("anthropic:claude-3-5-haiku-latest");
    expect(config.temperature).toBe(0);
  });

  test.concurrent("getTaskConfigKey should return correct keys", async () => {
    expect(getTaskConfigKey(LLMTask.PLANNER)).toBe("planner");
    expect(getTaskConfigKey(LLMTask.COORDINATOR)).toBe("coordinator");
    expect(getTaskConfigKey(LLMTask.SYNTHESIZER)).toBe("synthesizer");
    expect(getTaskConfigKey(LLMTask.OPTIMIZER)).toBe("optimizer");
  });

  test.concurrent("all tasks should have temperature 0 for consistency", async () => {
    for (const task of Object.values(LLMTask)) {
      const config = TASK_TO_CONFIG_DEFAULTS_MAP[task];
      expect(config.temperature).toBe(0);
    }
  });

  test.concurrent("all tasks should have valid model names", async () => {
    for (const task of Object.values(LLMTask)) {
      const config = TASK_TO_CONFIG_DEFAULTS_MAP[task];
      expect(config.modelName).toMatch(/^(anthropic|openai|google-genai):/);
    }
  });

  test.concurrent("task enum values should match config keys", async () => {
    for (const task of Object.values(LLMTask)) {
      expect(getTaskConfigKey(task)).toBe(task);
    }
  });
});
