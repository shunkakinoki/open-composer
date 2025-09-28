import { describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
  AgentRouterLive,
  activateAgent,
  executeSquadMode,
  getActiveAgents,
  getAgents,
  routeQuery,
} from "../src/index.js";

// Create mock agents that don't use execSync
const mockClaudeCodeAgent = {
  check: () =>
    Effect.succeed({
      name: "claude-code",
      available: true,
      version: "0.1.0",
      path: "claude",
    }),
  definition: {
    name: "claude-code",
    icon: "🤖",
    role: "Code review and planning",
    keywords: ["claude", "review", "analyze", "plan"],
  },
};

const mockCodexAgent = {
  check: () =>
    Effect.succeed({
      name: "codex",
      available: true,
      version: "0.1.0",
      path: "codex",
    }),
  definition: {
    name: "codex",
    icon: "📝",
    role: "Code generation and assistance",
    keywords: ["codex", "generate", "write", "code"],
  },
};

const mockOpencodeAgent = {
  check: () =>
    Effect.succeed({
      name: "opencode",
      available: true,
      version: "0.1.0",
      path: "opencode",
    }),
  definition: {
    name: "opencode",
    icon: "🌐",
    role: "Open-source code assistance",
    keywords: ["open", "opensource", "snippet", "search"],
  },
};

// Mock the agent modules
mock.module("@open-composer/agent-claude-code", () => ({
  default: mockClaudeCodeAgent,
}));

mock.module("@open-composer/agent-codex", () => ({
  default: mockCodexAgent,
}));

mock.module("@open-composer/agent-opencode", () => ({
  default: mockOpencodeAgent,
}));

const provideRouter = <A>(effect: Effect.Effect<A>) =>
  effect.pipe(Effect.provide(AgentRouterLive));

describe("AgentRouter", () => {
  test("initializes with default agents", async () => {
    const agents = await Effect.runPromise(provideRouter(getAgents));

    expect(agents.length).toBeGreaterThan(0);
    expect(agents.find((agent) => agent.name === "claude-code")).toBeDefined();
  });

  test("activates agents via effect", async () => {
    const activeAgents = await Effect.runPromise(
      provideRouter(
        Effect.gen(function* () {
          yield* activateAgent("opencode");
          return yield* getActiveAgents;
        }),
      ),
    );

    expect(activeAgents.some((agent) => agent.name === "opencode")).toBe(true);
  });

  test("routes queries based on CLI path", async () => {
    const response = await Effect.runPromise(
      provideRouter(
        Effect.gen(function* () {
          yield* activateAgent("opencode");
          return yield* routeQuery({
            query: "please build something",
            cliPath: ["open-composer", "open"],
          });
        }),
      ),
    );

    expect(response.agent).toBe("opencode");
  });

  test("falls back to default agent", async () => {
    const response = await Effect.runPromise(
      provideRouter(
        routeQuery({
          query: "assist me",
          cliPath: ["open-composer"],
        }),
      ),
    );

    expect(response.agent).toBe("claude-code");
  });

  test("executes squad mode", async () => {
    const responses = await Effect.runPromise(
      provideRouter(
        Effect.gen(function* () {
          yield* activateAgent("opencode");
          return yield* executeSquadMode({
            query: "optimize this function",
            cliPath: ["open-composer", "optimize"],
            agents: ["claude-code", "opencode"],
          });
        }),
      ),
    );

    expect(responses).toHaveLength(2);
    expect(responses.map((r) => r.agent)).toEqual(["claude-code", "opencode"]);
  });
});
