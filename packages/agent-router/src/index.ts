import { default as claudeCodeAgent } from "@open-composer/agent-claude-code";
import { default as codexAgent } from "@open-composer/agent-codex";
import { default as opencodeAgent } from "@open-composer/agent-opencode";
import type {
  Agent,
  AgentChecker,
  AgentResponse,
  AgentStatus,
} from "@open-composer/agent-types";
import {
  type AgentCache,
  type ConfigServiceInterface,
  getAgentCache,
  updateAgentCache,
} from "@open-composer/config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";

export const AVAILABLE_AGENTS: readonly AgentChecker[] = [
  codexAgent,
  claudeCodeAgent,
  opencodeAgent,
] as const;

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Function to get all available agents (called by agent router)
const getAvailableAgentsFromAgents = (): Effect.Effect<
  readonly AgentChecker[],
  never,
  ConfigServiceInterface
> => {
  return pipe(
    getAgentCache(),
    Effect.map((cache: AgentCache | undefined): readonly AgentChecker[] => {
      if (cache) {
        const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
        if (cacheAge <= CACHE_TTL_MS) {
          // Cache is valid, return cached agents without checking
          const cachedAgentNames = new Set(
            cache.agents.map(
              (a: { name: string; available: boolean; lastChecked: string }) =>
                a.name,
            ),
          );
          return AVAILABLE_AGENTS.filter(
            (agent) =>
              cachedAgentNames.has(agent.definition.name) &&
              cache.agents.find(
                (c: {
                  name: string;
                  available: boolean;
                  lastChecked: string;
                }) => c.name === agent.definition.name,
              )?.available,
          );
        }
      }

      // Cache is invalid or missing, we need to check agents (but this will be handled by the caller)
      // For now, return empty array - the actual checking happens in the refresh or when cache is updated
      return [];
    }),
  );
};

export interface RouteQueryInput {
  readonly query: string;
  readonly cliPath: ReadonlyArray<string>;
  readonly explicitAgent?: string | undefined;
}

export interface SquadModeInput extends RouteQueryInput {
  readonly agents: ReadonlyArray<string>;
}

export interface AgentRouter {
  readonly getAgents: Effect.Effect<
    readonly Agent[],
    never,
    ConfigServiceInterface
  >;
  readonly getActiveAgents: Effect.Effect<
    readonly Agent[],
    never,
    ConfigServiceInterface
  >;
  readonly getAvailableAgents: Effect.Effect<
    readonly AgentChecker[],
    never,
    ConfigServiceInterface
  >;
  readonly refreshAgentCache: Effect.Effect<
    readonly AgentChecker[],
    never,
    ConfigServiceInterface
  >;
  readonly activateAgent: (
    agentName: string,
  ) => Effect.Effect<boolean, never, ConfigServiceInterface>;
  readonly deactivateAgent: (
    agentName: string,
  ) => Effect.Effect<boolean, never, ConfigServiceInterface>;
  readonly routeQuery: (
    input: RouteQueryInput,
  ) => Effect.Effect<AgentResponse, never, ConfigServiceInterface>;
  readonly executeSquadMode: (
    input: SquadModeInput,
  ) => Effect.Effect<readonly AgentResponse[], never, ConfigServiceInterface>;
}

export const AgentRouter = Context.GenericTag<AgentRouter>(
  "agent-router/AgentRouter",
);

type AgentMatcher = (input: RouteQueryInput) => boolean;

interface AgentState extends Agent {
  readonly matcher: AgentMatcher;
}

const normalize = (value: string) => value.toLowerCase();

const createMatcher =
  (...keywords: readonly string[]): AgentMatcher =>
  ({ query, cliPath }) => {
    if (keywords.length === 0) {
      return false;
    }

    const normalizedQuery = normalize(query);
    const normalizedPath = cliPath.map(normalize);

    return keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      if (normalizedQuery.includes(normalizedKeyword)) {
        return true;
      }
      return normalizedPath.some((segment) =>
        segment.includes(normalizedKeyword),
      );
    });
  };

// Cache-aware agent loading functions
const getAvailableAgentsEffect: Effect.Effect<
  readonly AgentChecker[],
  never,
  ConfigServiceInterface
> = pipe(
  getAvailableAgentsFromAgents(),
  Effect.flatMap((cachedAgents) => {
    if (cachedAgents.length > 0) {
      // Cache hit - return cached agents
      return Effect.succeed(cachedAgents);
    } else {
      // Cache miss - do fresh check and update cache
      return pipe(
        Effect.all(
          AVAILABLE_AGENTS.map((agentChecker) =>
            pipe(
              agentChecker.check(),
              Effect.map((status) => ({ agentChecker, status })),
            ),
          ),
          { concurrency: "unbounded" },
        ),
        Effect.flatMap((results) => {
          const availableAgents = results
            .filter(({ status }) => status.available)
            .map(({ agentChecker }) => agentChecker);

          // Update cache with fresh results
          const cacheData: AgentCache = {
            agents: results.map(({ agentChecker, status }) => ({
              name: agentChecker.definition.name,
              available: status.available,
              lastChecked: new Date().toISOString(),
            })),
            lastUpdated: new Date().toISOString(),
          };

          return pipe(
            updateAgentCache(cacheData),
            Effect.map(() => availableAgents),
            Effect.catchAll(() => Effect.succeed(availableAgents)), // Ignore cache update errors
          );
        }),
      );
    }
  }),
  Effect.catchAll(() => Effect.succeed([] as readonly AgentChecker[])),
);

const refreshAgentCacheEffect: Effect.Effect<
  readonly AgentChecker[],
  never,
  ConfigServiceInterface
> = pipe(
  Effect.all(
    AVAILABLE_AGENTS.map((agentChecker) =>
      pipe(
        agentChecker.check(),
        Effect.map((status) => ({ agentChecker, status })),
      ),
    ),
    { concurrency: "unbounded" },
  ),
  Effect.flatMap((results) => {
    const availableAgents = results
      .filter(({ status }) => status.available)
      .map(({ agentChecker }) => agentChecker);

    // Update cache with fresh results
    const cacheData: AgentCache = {
      agents: results.map(({ agentChecker, status }) => ({
        name: agentChecker.definition.name,
        available: status.available,
        lastChecked: new Date().toISOString(),
      })),
      lastUpdated: new Date().toISOString(),
    };

    return pipe(
      updateAgentCache(cacheData),
      Effect.map(() => availableAgents),
      Effect.catchAll(() => Effect.succeed(availableAgents)), // Ignore cache update errors
    );
  }),
  Effect.catchAll(() => Effect.succeed([] as readonly AgentChecker[])),
);

const makeAgents = (): Effect.Effect<
  ReadonlyArray<AgentState>,
  never,
  ConfigServiceInterface
> =>
  pipe(
    getAvailableAgentsEffect,
    Effect.flatMap((availableAgents) =>
      pipe(
        Effect.forEach(availableAgents, (agentChecker) =>
          pipe(
            agentChecker.check(),
            Effect.map((status: AgentStatus) => {
              if (status.available) {
                return {
                  name: status.name,
                  icon: agentChecker.definition.icon,
                  role: agentChecker.definition.role,
                  active: status.name === "claude-code", // Default claude-code to active
                  matcher: createMatcher(...agentChecker.definition.keywords),
                } satisfies AgentState;
              } else {
                // Include unavailable agents with inactive status for visibility
                return {
                  name: status.name,
                  icon: agentChecker.definition.icon,
                  role: `${agentChecker.definition.role} (Not Available)`,
                  active: false,
                  matcher: createMatcher(...agentChecker.definition.keywords),
                } satisfies AgentState;
              }
            }),
            Effect.catchAll(() =>
              Effect.succeed({
                name: agentChecker.definition.name,
                icon: agentChecker.definition.icon,
                role: `${agentChecker.definition.role} (Check Failed)`,
                active: false,
                matcher: createMatcher(...agentChecker.definition.keywords),
              } satisfies AgentState),
            ),
          ),
        ),
        Effect.map((agents) => agents as ReadonlyArray<AgentState>),
      ),
    ),
  );

const stripMatcher = (agent: AgentState): Agent => ({
  name: agent.name,
  icon: agent.icon,
  role: agent.role,
  active: agent.active,
});

const setAgentActive = (
  agentsRef: Ref.Ref<ReadonlyArray<AgentState>>,
  agentName: string,
  active: boolean,
) =>
  Ref.modify(agentsRef, (agents) => {
    let found = false;
    const updated = agents.map((agent) => {
      if (agent.name === agentName) {
        found = true;
        if (agent.active === active) {
          return agent;
        }
        return { ...agent, active } satisfies AgentState;
      }
      return agent;
    });
    return [found, updated] as const;
  });

const selectAgent = (
  agents: ReadonlyArray<AgentState>,
  input: RouteQueryInput,
): AgentState => {
  const explicitMatch = input.explicitAgent
    ? agents.find((agent) => agent.name === input.explicitAgent)
    : undefined;

  if (explicitMatch) {
    return explicitMatch;
  }

  const matcher = agents.find((agent) => agent.active && agent.matcher(input));

  if (matcher) {
    return matcher;
  }

  const claude = agents.find((agent) => agent.name === "claude-code");
  if (claude) {
    return claude;
  }

  const firstAvailable = agents.find((agent) => agent.active);
  if (firstAvailable) {
    return firstAvailable;
  }

  return agents[0];
};

const sendToAgent = (agent: AgentState, query: string): AgentResponse => {
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
  } satisfies AgentResponse;
};

export const AgentRouterLive = Layer.effect(
  AgentRouter,
  Effect.gen(function* () {
    // Initialize with empty agents and load them lazily to avoid initialization issues
    const agentsRef = yield* Ref.make<ReadonlyArray<AgentState>>([]);

    const getAgents = pipe(
      Ref.get(agentsRef),
      Effect.flatMap((agents) => {
        if (agents.length === 0) {
          // Load agents lazily on first access
          return pipe(
            makeAgents(),
            Effect.flatMap((loadedAgents) =>
              pipe(
                Ref.set(agentsRef, loadedAgents),
                Effect.map(() => loadedAgents.map(stripMatcher)),
              ),
            ),
          );
        }
        return Effect.succeed(agents.map(stripMatcher));
      }),
    );

    const getActiveAgents = pipe(
      Ref.get(agentsRef),
      Effect.flatMap((agents) => {
        if (agents.length === 0) {
          // Load agents lazily on first access
          return pipe(
            makeAgents(),
            Effect.flatMap((loadedAgents) =>
              pipe(
                Ref.set(agentsRef, loadedAgents),
                Effect.map(() =>
                  loadedAgents
                    .filter((agent) => agent.active)
                    .map(stripMatcher),
                ),
              ),
            ),
          );
        }
        return Effect.succeed(
          agents.filter((agent) => agent.active).map(stripMatcher),
        );
      }),
    );

    const activateAgent = (agentName: string) =>
      setAgentActive(agentsRef, agentName, true);
    const deactivateAgent = (agentName: string) =>
      setAgentActive(agentsRef, agentName, false);

    const routeQuery = (input: RouteQueryInput) =>
      pipe(
        Ref.get(agentsRef),
        Effect.flatMap((agents) => {
          if (agents.length === 0) {
            // Load agents lazily on first access
            return pipe(
              makeAgents(),
              Effect.flatMap((loadedAgents) =>
                pipe(
                  Ref.set(agentsRef, loadedAgents),
                  Effect.map(() => selectAgent(loadedAgents, input)),
                  Effect.map((agent) => sendToAgent(agent, input.query)),
                ),
              ),
            );
          }
          return pipe(
            Effect.succeed(selectAgent(agents, input)),
            Effect.map((agent) => sendToAgent(agent, input.query)),
          );
        }),
      );

    const executeSquadMode = ({ agents, ...rest }: SquadModeInput) =>
      pipe(
        Ref.get(agentsRef),
        Effect.flatMap((currentAgents) => {
          if (currentAgents.length === 0) {
            // Load agents lazily on first access
            return pipe(
              makeAgents(),
              Effect.flatMap((loadedAgents) =>
                pipe(
                  Ref.set(agentsRef, loadedAgents),
                  Effect.map(() => loadedAgents),
                ),
              ),
            );
          }
          return Effect.succeed(currentAgents);
        }),
        Effect.flatMap((agentStates) =>
          Effect.forEach(
            agents,
            (agentName) => {
              const found = agentStates.find(
                (agent) => agent.name === agentName,
              );
              if (!found) {
                return Effect.succeed({
                  agent: agentName,
                  content: `Unknown agent: ${agentName}`,
                  timestamp: new Date(),
                  success: false,
                } satisfies AgentResponse);
              }
              return Effect.succeed(sendToAgent(found, rest.query));
            },
            { concurrency: "unbounded" },
          ),
        ),
      );

    const service: AgentRouter = {
      getAgents,
      getActiveAgents,
      getAvailableAgents: getAvailableAgentsEffect,
      refreshAgentCache: refreshAgentCacheEffect,
      activateAgent,
      deactivateAgent,
      routeQuery,
      executeSquadMode,
    };

    return service;
  }),
);

const withRouter = <A>(
  f: (router: AgentRouter) => Effect.Effect<A, never, ConfigServiceInterface>,
): Effect.Effect<A, never, ConfigServiceInterface> =>
  Effect.flatMap(
    Effect.contextWith((context) => Context.unsafeGet(context, AgentRouter)),
    f,
  );

export const getAgents: Effect.Effect<
  readonly Agent[],
  never,
  ConfigServiceInterface
> = withRouter((router) => router.getAgents);
export const getActiveAgents: Effect.Effect<
  readonly Agent[],
  never,
  ConfigServiceInterface
> = withRouter((router) => router.getActiveAgents);
export const getAvailableAgents: Effect.Effect<
  readonly AgentChecker[],
  never,
  ConfigServiceInterface
> = withRouter((router) => router.getAvailableAgents);
export const refreshAgentCache = (): Effect.Effect<
  readonly AgentChecker[],
  never,
  ConfigServiceInterface
> => refreshAgentCacheEffect;
export const activateAgent = (
  agentName: string,
): Effect.Effect<boolean, never, ConfigServiceInterface> =>
  withRouter((router) => router.activateAgent(agentName));
export const deactivateAgent = (
  agentName: string,
): Effect.Effect<boolean, never, ConfigServiceInterface> =>
  withRouter((router) => router.deactivateAgent(agentName));
export const routeQuery = (
  input: RouteQueryInput,
): Effect.Effect<AgentResponse, never, ConfigServiceInterface> =>
  withRouter((router) => router.routeQuery(input));
export const executeSquadMode = (
  input: SquadModeInput,
): Effect.Effect<readonly AgentResponse[], never, ConfigServiceInterface> =>
  withRouter((router) => router.executeSquadMode(input));

// Re-export types for convenience
export type {
  AgentChecker,
  AgentDefinition,
  AgentResponse,
  AgentStatus,
} from "@open-composer/agent-types";
