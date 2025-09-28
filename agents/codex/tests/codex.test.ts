import { describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";
import checkCodex from "../src/index.js";

describe("Codex Agent", () => {
  test("exports AgentChecker with correct structure", () => {
    expect(checkCodex).toHaveProperty("check");
    expect(checkCodex).toHaveProperty("definition");
    expect(typeof checkCodex.check).toBe("function");
  });

  test("has correct definition", () => {
    const { definition } = checkCodex;

    expect(definition.name).toBe("codex");
    expect(definition.icon).toBe("📝");
    expect(definition.role).toBe("Code generation and assistance");
    expect(definition.keywords).toEqual(["codex", "generate", "write", "code"]);
  });

  test("check function returns AgentStatus effect", async () => {
    // Mock execSync to avoid slow system calls during testing
    mock.module("node:child_process", () => ({
      execSync: mock(() => "version 0.1.0"),
    }));

    const checkEffect = checkCodex.check();
    expect(checkEffect).toBeDefined();

    // The effect should be runnable and return an AgentStatus
    const result = await Effect.runPromise(checkEffect);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("available");
    expect(result.name).toBe("codex");
    expect(result.available).toBe(true);
    expect(result.version).toBe("0.1.0");
  });
});
