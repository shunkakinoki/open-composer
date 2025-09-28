import { describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";
import checkOpencode from "../src/index.js";

describe("Opencode Agent", () => {
  test("exports AgentChecker with correct structure", () => {
    expect(checkOpencode).toHaveProperty("check");
    expect(checkOpencode).toHaveProperty("definition");
    expect(typeof checkOpencode.check).toBe("function");
  });

  test("has correct definition", () => {
    const { definition } = checkOpencode;

    expect(definition.name).toBe("opencode");
    expect(definition.icon).toBe("🌐");
    expect(definition.role).toBe("Open-source code assistance");
    expect(definition.keywords).toEqual([
      "open",
      "opensource",
      "snippet",
      "search",
    ]);
  });

  test("check function returns AgentStatus effect", async () => {
    // Mock execSync to avoid slow system calls during testing
    mock.module("node:child_process", () => ({
      execSync: mock(() => "version 0.1.0"),
    }));

    const checkEffect = checkOpencode.check();
    expect(checkEffect).toBeDefined();

    // The effect should be runnable and return an AgentStatus
    const result = await Effect.runPromise(checkEffect);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("available");
    expect(result.name).toBe("opencode");
    expect(result.available).toBe(true);
    expect(result.version).toBe("0.1.0");
  });
});
