import {
  type AgentResponse,
  activateAgent as activateAgentEffect,
  deactivateAgent as deactivateAgentEffect,
  getActiveAgents,
  getAgents,
  routeQuery,
} from "@open-composer/agent-router";
import type { CacheServiceInterface } from "@open-composer/cache";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";

interface ListOptions {
  readonly activeOnly?: boolean;
}

interface RouteOptions {
  readonly query: string;
  readonly cliPath?: ReadonlyArray<string>;
  readonly agent?: string;
}

const printLines = (lines: ReadonlyArray<string>) =>
  Effect.forEach(lines, (line) => Console.log(line), { discard: true });

const defaultCliPath = () => ["open-composer"] as const;

export class AgentService {
  constructor(private readonly cliPath: ReadonlyArray<string>) {}

  static make(): Effect.Effect<AgentService> {
    return Effect.sync(() => new AgentService(defaultCliPath()));
  }

  list(
    options: ListOptions = {},
  ): Effect.Effect<void, never, CacheServiceInterface> {
    const { activeOnly = false } = options;

    const source = activeOnly ? getActiveAgents : getAgents;

    return source.pipe(
      Effect.flatMap((agents) => {
        if (agents.length === 0) {
          return printLines(["No agents are currently registered."]);
        }

        const header = activeOnly ? "Active agents:" : "Agents:";
        const rows = agents.map(
          (agent) =>
            `${agent.active ? "*" : " "} ${agent.name.padEnd(15)} ${agent.role}`,
        );
        return printLines([header, ...rows]);
      }),
    );
  }

  activate(
    agentName: string,
  ): Effect.Effect<void, never, CacheServiceInterface> {
    return activateAgentEffect(agentName).pipe(
      Effect.flatMap((result) => {
        const message = result
          ? `Activated agent: ${agentName}`
          : `Agent not found: ${agentName}`;
        return printLines([message]);
      }),
    );
  }

  deactivate(
    agentName: string,
  ): Effect.Effect<void, never, CacheServiceInterface> {
    return deactivateAgentEffect(agentName).pipe(
      Effect.flatMap((result) => {
        const message = result
          ? `Deactivated agent: ${agentName}`
          : `Agent not found: ${agentName}`;
        return printLines([message]);
      }),
    );
  }

  route(
    options: RouteOptions,
  ): Effect.Effect<void, never, CacheServiceInterface> {
    const cliPath = options.cliPath ?? this.cliPath;
    return routeQuery({
      query: options.query,
      cliPath,
      explicitAgent: options.agent,
    }).pipe(Effect.flatMap((response) => this.printResponse(response)));
  }

  private printResponse(response: AgentResponse): Effect.Effect<void> {
    const lines = [
      `Agent: ${response.agent}`,
      `Response: ${response.content}`,
      `Success: ${response.success ? "yes" : "no"}`,
    ];
    return printLines(lines);
  }
}
