import { default as claudeCodeAgent } from "@open-composer/agent-claude-code";
import { default as codexAgent } from "@open-composer/agent-codex";
import { default as opencodeAgent } from "@open-composer/agent-opencode";
import type {
  Agent,
  AgentChecker,
  AgentResponse,
  AgentStatus,
} from "@open-composer/agent-types";
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

// Function to get all available agents (called by agent router)
const getAvailableAgentsFromAgents = async (): Promise<
  readonly AgentChecker[]
> => {
  // Check installation status for each agent
  const checkedAgents = await Effect.runPromise(
    pipe(
      Effect.forEach(AVAILABLE_AGENTS, (agentChecker) =>
        pipe(
          agentChecker.check(),
          Effect.map((status) => ({ agentChecker, status })),
        ),
      ),
      Effect.map((results) =>
        results
          .filter(({ status }) => status.available)
          .map(({ agentChecker }) => agentChecker),
      ),
    ),
  );

  return checkedAgents;
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
  readonly getAgents: Effect.Effect<readonly Agent[]>;
  readonly getActiveAgents: Effect.Effect<readonly Agent[]>;
  readonly getAvailableAgents: Effect.Effect<readonly AgentChecker[]>;
  readonly activateAgent: (agentName: string) => Effect.Effect<boolean>;
  readonly deactivateAgent: (agentName: string) => Effect.Effect<boolean>;
  readonly routeQuery: (input: RouteQueryInput) => Effect.Effect<AgentResponse>;
  readonly executeSquadMode: (
    input: SquadModeInput,
  ) => Effect.Effect<readonly AgentResponse[]>;
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

const makeAgents = (): Effect.Effect<ReadonlyArray<AgentState>, never> =>
  pipe(
    Effect.suspend(() =>
      Effect.tryPromise(() => getAvailableAgentsFromAgents()).pipe(
        Effect.catchAll(() => Effect.succeed([] as readonly AgentChecker[])),
      ),
    ),
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
    const initialAgents = yield* makeAgents();
    const agentsRef = yield* Ref.make<ReadonlyArray<AgentState>>(initialAgents);

    const getAgents = pipe(
      Ref.get(agentsRef),
      Effect.map((agents) => agents.map(stripMatcher)),
    );

    const getActiveAgents = pipe(
      Ref.get(agentsRef),
      Effect.map((agents) =>
        agents.filter((agent) => agent.active).map(stripMatcher),
      ),
    );

    const activateAgent = (agentName: string) =>
      setAgentActive(agentsRef, agentName, true);
    const deactivateAgent = (agentName: string) =>
      setAgentActive(agentsRef, agentName, false);

    const routeQuery = (input: RouteQueryInput) =>
      pipe(
        Ref.get(agentsRef),
        Effect.map((agents) => selectAgent(agents, input)),
        Effect.map((agent) => sendToAgent(agent, input.query)),
      );

    const getAvailableAgentsEffect = pipe(
      Effect.tryPromise(() => getAvailableAgentsFromAgents()),
      Effect.catchAll(() => Effect.succeed([] as readonly AgentChecker[])),
    );

    const executeSquadMode = ({ agents, ...rest }: SquadModeInput) =>
      Effect.forEach(
        agents,
        (agentName) =>
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
              return Effect.succeed(sendToAgent(found, rest.query));
            }),
          ),
        { concurrency: "unbounded" },
      );

    const service: AgentRouter = {
      getAgents,
      getActiveAgents,
      getAvailableAgents: getAvailableAgentsEffect,
      activateAgent,
      deactivateAgent,
      routeQuery,
      executeSquadMode,
    };

    return service;
  }),
);

const withRouter = <A>(
  f: (router: AgentRouter) => Effect.Effect<A>,
): Effect.Effect<A> =>
  Effect.flatMap(
    Effect.contextWith((context) => Context.unsafeGet(context, AgentRouter)),
    f,
  );

export const getAgents = withRouter((router) => router.getAgents);
export const getActiveAgents = withRouter((router) => router.getActiveAgents);
export const getAvailableAgents = withRouter(
  (router) => router.getAvailableAgents,
);
export const activateAgent = (agentName: string) =>
  withRouter((router) => router.activateAgent(agentName));
export const deactivateAgent = (agentName: string) =>
  withRouter((router) => router.deactivateAgent(agentName));
export const routeQuery = (input: RouteQueryInput) =>
  withRouter((router) => router.routeQuery(input));
export const executeSquadMode = (input: SquadModeInput) =>
  withRouter((router) => router.executeSquadMode(input));

// Re-export types for convenience
export type {
  AgentChecker,
  AgentDefinition,
  AgentResponse,
  AgentStatus,
} from "@open-composer/agent-types";
