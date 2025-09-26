import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
  AgentRouterLive,
  activateAgent,
  executeSquadMode,
  getActiveAgents,
  getAgents,
  routeQuery,
} from "../src/index.js";

const provideRouter = <A>(effect: Effect.Effect<A>) =>
  effect.pipe(Effect.provide(AgentRouterLive));

describe("AgentRouter", () => {
  test("initializes with default agents", async () => {
    const agents = await Effect.runPromise(provideRouter(getAgents));

    expect(agents).toHaveLength(5);
    expect(agents.find((agent) => agent.name === "claude-code")).toBeDefined();
  });

  test("activates agents via effect", async () => {
    const activeAgents = await Effect.runPromise(
      provideRouter(
        Effect.gen(function* () {
          yield* activateAgent("codex-nation");
          return yield* getActiveAgents;
        }),
      ),
    );

    expect(activeAgents.some((agent) => agent.name === "codex-nation")).toBe(
      true,
    );
  });

  test("routes queries based on CLI path", async () => {
    const response = await Effect.runPromise(
      provideRouter(
        Effect.gen(function* () {
          yield* activateAgent("codex-nation");
          return yield* routeQuery({
            query: "please build something",
            cliPath: ["open-composer", "codex"],
          });
        }),
      ),
    );

    expect(response.agent).toBe("codex-nation");
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
          yield* activateAgent("codex-nation");
          return yield* executeSquadMode({
            query: "optimize this function",
            cliPath: ["open-composer", "optimize"],
            agents: ["claude-code", "codex-nation"],
          });
        }),
      ),
    );

    expect(responses).toHaveLength(2);
    expect(responses.map((r) => r.agent)).toEqual([
      "claude-code",
      "codex-nation",
    ]);
  });
});
