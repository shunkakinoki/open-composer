import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type {
  Agent,
  AgentChecker,
  AgentDefinition,
  AgentResponse,
  AgentStatus,
} from "../src/index.js";

describe("Agent Types", () => {
  test("exports all required type interfaces", () => {
    // This test verifies that the types are properly exported
    // TypeScript compilation will fail if any of these types don't exist
    const agent: Agent = {
      name: "test-agent",
      icon: "🤖",
      role: "Test agent",
      active: true,
    };

    const agentDefinition: AgentDefinition = {
      name: "test-agent",
      icon: "🤖",
      role: "Test agent",
      keywords: ["test", "agent"],
    };

    const agentStatus: AgentStatus = {
      name: "test-agent",
      available: true,
      version: "1.0.0",
      path: "/usr/bin/test-agent",
    };

    const agentResponse: AgentResponse = {
      agent: "test-agent",
      content: "Test response",
      timestamp: new Date(),
      success: true,
    };

    // Verify the objects conform to their types
    expect(agent.name).toBe("test-agent");
    expect(agentDefinition.keywords).toEqual(["test", "agent"]);
    expect(agentStatus.available).toBe(true);
    expect(agentResponse.success).toBe(true);
  });

  test("AgentChecker type can be implemented", () => {
    // This test verifies that the AgentChecker interface can be implemented
    const mockChecker: AgentChecker = {
      definition: {
        name: "mock-agent",
        icon: "🤖",
        role: "Mock agent for testing",
        keywords: ["mock", "test"],
      },
      check: () =>
        Effect.succeed({
          name: "mock-agent",
          available: true,
        } satisfies AgentStatus),
    };

    expect(mockChecker.definition.name).toBe("mock-agent");
    expect(typeof mockChecker.check).toBe("function");
  });
});
