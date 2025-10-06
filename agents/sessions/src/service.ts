import { parseClaudeCodeSessions } from "@open-composer/agent-claude-code";
import { parseCodexSessions } from "@open-composer/agent-codex";
import { parseCursorSessions } from "@open-composer/agent-cursor";
import { parseOpencodeSessions } from "@open-composer/agent-opencode";
import * as Effect from "effect/Effect";
import type { AgentSession } from "./types.js";

// -----------------------------------------------------------------------------
// Agents Sessions Service
// -----------------------------------------------------------------------------

export class AgentSessionsService {
  /**
   * Get all AI sessions from all supported agents
   */
  getAllSessions = (): Effect.Effect<AgentSession[], Error> =>
    Effect.gen(function* () {
      // Parse sessions from all agents in parallel
      const [
        codexSessions,
        cursorSessions,
        opencodeSessions,
        claudeCodeSessions,
      ] = yield* Effect.all(
        [
          parseCodexSessions().pipe(Effect.orElse(() => Effect.succeed([]))),
          parseCursorSessions().pipe(Effect.orElse(() => Effect.succeed([]))),
          parseOpencodeSessions().pipe(Effect.orElse(() => Effect.succeed([]))),
          parseClaudeCodeSessions().pipe(
            Effect.orElse(() => Effect.succeed([])),
          ),
        ],
        { concurrency: "unbounded" },
      );

      // Combine all sessions
      const allSessions = [
        ...codexSessions,
        ...cursorSessions,
        ...opencodeSessions,
        ...claudeCodeSessions,
      ];

      // Sort by timestamp (most recent first)
      allSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return allSessions;
    });

  /**
   * Get sessions filtered by agent type
   */
  getSessionsByAgent = (
    agent: AgentSession["agent"],
  ): Effect.Effect<AgentSession[], Error> =>
    Effect.gen((function* (this: AgentSessionsService) {
      const allSessions: AgentSession[] = yield* this.getAllSessions();
      return allSessions.filter((s: AgentSession) => s.agent === agent);
    }).bind(this));

  /**
   * Get sessions filtered by status
   */
  getSessionsByStatus = (
    status: AgentSession["status"],
  ): Effect.Effect<AgentSession[], Error> =>
    Effect.gen((function* (this: AgentSessionsService) {
      const allSessions: AgentSession[] = yield* this.getAllSessions();
      return allSessions.filter((s: AgentSession) => s.status === status);
    }).bind(this));

  /**
   * Get sessions for a specific repository
   */
  getSessionsByRepository = (
    repository: string,
  ): Effect.Effect<AgentSession[], Error> =>
    Effect.gen((function* (this: AgentSessionsService) {
      const allSessions: AgentSession[] = yield* this.getAllSessions();
      return allSessions.filter((s: AgentSession) => s.repository?.includes(repository));
    }).bind(this));
}
