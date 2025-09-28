import { describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";
import checkClaudeCode from "../src/index.js";

describe("Claude Code Agent", () => {
  test("exports AgentChecker with correct structure", () => {
    expect(checkClaudeCode).toHaveProperty("check");
    expect(checkClaudeCode).toHaveProperty("definition");
    expect(typeof checkClaudeCode.check).toBe("function");
  });

  test("has correct definition", () => {
    const { definition } = checkClaudeCode;

    expect(definition.name).toBe("claude-code");
    expect(definition.icon).toBe("🤖");
    expect(definition.role).toBe("Code review and planning");
    expect(definition.keywords).toEqual([
      "claude",
      "review",
      "analyze",
      "plan",
    ]);
  });

  test("check function returns AgentStatus effect", async () => {
    // Mock execSync to avoid system calls during testing (optimized for speed)
    const execSyncMock = mock(() => "claude version 0.1.0");

    mock.module("node:child_process", () => ({
      execSync: execSyncMock,
    }));

    const checkEffect = checkClaudeCode.check();
    expect(checkEffect).toBeDefined();

    // The effect should be runnable and return an AgentStatus
    const result = await Effect.runPromise(checkEffect);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("available");
    expect(result.name).toBe("claude-code");
    expect(result.available).toBe(true);
    expect(result.version).toBe("0.1.0");
  });
});
