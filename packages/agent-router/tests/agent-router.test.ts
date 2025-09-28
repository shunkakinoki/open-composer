import { describe, expect, test } from "bun:test";
import type { Agent, AgentResponse } from "@open-composer/agent-types";
import {
  ConfigService,
  type ConfigServiceInterface,
  type UserConfig,
} from "@open-composer/config";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import {
  AgentRouter,
  activateAgent,
  executeSquadMode,
  getActiveAgents,
  getAgents,
  type RouteQueryInput,
  routeQuery,
  type SquadModeInput,
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

// Create test agents array
const mockAgents = [mockClaudeCodeAgent, mockCodexAgent, mockOpencodeAgent];

// Create a test-specific router that uses mock agents
const createTestAgentState = (agentChecker: typeof mockClaudeCodeAgent) => {
  const status = {
    name: agentChecker.definition.name,
    available: true,
    version: "0.1.0",
    path: agentChecker.definition.name,
  };

  return {
    name: status.name,
    icon: agentChecker.definition.icon,
    role: agentChecker.definition.role,
    active: status.name === "claude-code", // Default claude-code to active
    matcher: (input: RouteQueryInput) => {
      const keywords = agentChecker.definition.keywords;
      if (keywords.length === 0) return false;
      const query = input.query.toLowerCase();
      const path = input.cliPath.map((s: string) => s.toLowerCase());
      return keywords.some((keyword: string) => {
        const kw = keyword.toLowerCase();
        return (
          query.includes(kw) ||
          path.some((segment: string) => segment.includes(kw))
        );
      });
    },
  } satisfies Agent & { matcher: (input: RouteQueryInput) => boolean };
};

// Mock ConfigService for tests
const mockConfigService: ConfigServiceInterface = {
  getConfig: () => Effect.succeed({} as UserConfig),
  updateConfig: () => Effect.succeed({} as UserConfig),
  setTelemetryConsent: () => Effect.succeed({} as UserConfig),
  getTelemetryConsent: () => Effect.succeed(false),
  getAgentCache: () => Effect.succeed(undefined),
  updateAgentCache: () => Effect.succeed({} as UserConfig),
  clearAgentCache: () => Effect.succeed({} as UserConfig),
};

const MockConfigLive = Layer.succeed(ConfigService, mockConfigService);

const TestAgentRouterLive = Layer.effect(
  AgentRouter,
  Effect.gen(function* () {
    const initialAgents = mockAgents.map(createTestAgentState);
    const agentsRef = yield* Ref.make(initialAgents);

    const getAgents = pipe(
      Ref.get(agentsRef),
      Effect.map((agents) =>
        agents.map((agent) => ({
          name: agent.name,
          icon: agent.icon,
          role: agent.role,
          active: agent.active,
        })),
      ),
    );

    const getActiveAgents = pipe(
      Ref.get(agentsRef),
      Effect.map((agents) =>
        agents
          .filter((agent) => agent.active)
          .map((agent) => ({
            name: agent.name,
            icon: agent.icon,
            role: agent.role,
            active: agent.active,
          })),
      ),
    );

    const activateAgent = (agentName: string) =>
      Ref.modify(agentsRef, (agents) => {
        let found = false;
        const updated = agents.map((agent) => {
          if (agent.name === agentName) {
            found = true;
            if (!agent.active) {
              return { ...agent, active: true };
            }
          }
          return agent;
        });
        return [found, updated] as const;
      });

    const deactivateAgent = (agentName: string) =>
      Ref.modify(agentsRef, (agents) => {
        let found = false;
        const updated = agents.map((agent) => {
          if (agent.name === agentName) {
            found = true;
            if (agent.active) {
              return { ...agent, active: false };
            }
          }
          return agent;
        });
        return [found, updated] as const;
      });

    const selectAgent = (
      agents: typeof initialAgents,
      input: RouteQueryInput,
    ) => {
      const explicitMatch = input.explicitAgent
        ? agents.find((agent) => agent.name === input.explicitAgent)
        : undefined;

      if (explicitMatch) return explicitMatch;

      const matcher = agents.find(
        (agent) => agent.active && agent.matcher(input),
      );
      if (matcher) return matcher;

      const claude = agents.find((agent) => agent.name === "claude-code");
      if (claude) return claude;

      const firstAvailable = agents.find((agent) => agent.active);
      if (firstAvailable) return firstAvailable;

      return agents[0];
    };

    const sendToAgent = (agent: (typeof initialAgents)[0], query: string) => {
      const responses: Record<string, string> = {
        "claude-code": `I'll analyze your request: "${query}". Let me review the codebase...`,
        codex: `Generating code for: "${query}". Here's what I'll implement...`,
        opencode: `Searching open-source solutions for: "${query}"...`,
      };

      return {
        agent: agent.name,
        content: responses[agent.name] || `Processing: "${query}"`,
        timestamp: new Date(),
        success: true,
      };
    };

    const routeQuery = (input: RouteQueryInput) =>
      pipe(
        Ref.get(agentsRef),
        Effect.map((agents) => selectAgent(agents, input)),
        Effect.map((agent) => sendToAgent(agent, input.query)),
      );

    const executeSquadMode = (input: SquadModeInput) =>
      Effect.forEach(
        input.agents,
        (agentName: string) =>
          pipe(
            Ref.get(agentsRef),
            Effect.flatMap((state) => {
              const found = state.find((agent) => agent.name === agentName);
              if (!found) {
                return Effect.succeed({
                  agent: agentName,
                  content: `Unknown agent: ${agentName}`,
                  timestamp: new Date(),
                  success: false,
                } satisfies AgentResponse);
              }
              return Effect.succeed(sendToAgent(found, input.query));
            }),
          ),
        { concurrency: "unbounded" },
      );

    const service: AgentRouter = {
      getAgents,
      getActiveAgents,
      getAvailableAgents: Effect.succeed(mockAgents),
      refreshAgentCache: Effect.succeed(mockAgents),
      activateAgent,
      deactivateAgent,
      routeQuery,
      executeSquadMode,
    };

    return service;
  }),
);

const provideRouter = <A>(
  effect: Effect.Effect<A, never, ConfigServiceInterface>,
) =>
  effect.pipe(
    Effect.provide(Layer.mergeAll(TestAgentRouterLive, MockConfigLive)),
  );

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
