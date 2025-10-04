import { parseClaudeCodeSessions } from "@open-composer/agent-claude-code";
import { parseCodexSessions } from "@open-composer/agent-codex";
import { parseCursorSessions } from "@open-composer/agent-cursor";
import { parseOpencodeSessions } from "@open-composer/agent-opencode";
import * as Effect from "effect/Effect";
import type { AISession } from "./types.js";

// -----------------------------------------------------------------------------
// AI Sessions Service
// -----------------------------------------------------------------------------

export class AISessionsService {
  /**
   * Get all AI sessions from all supported agents
   */
  getAllSessions = (): Effect.Effect<AISession[], Error> =>
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
    agent: AISession["agent"],
  ): Effect.Effect<AISession[], Error> =>
    Effect.gen(function* () {
      const allSessions = yield* this.getAllSessions();
      return allSessions.filter((s) => s.agent === agent);
    });

  /**
   * Get sessions filtered by status
   */
  getSessionsByStatus = (
    status: AISession["status"],
  ): Effect.Effect<AISession[], Error> =>
    Effect.gen(function* () {
      const allSessions = yield* this.getAllSessions();
      return allSessions.filter((s) => s.status === status);
    });

  /**
   * Get sessions for a specific repository
   */
  getSessionsByRepository = (
    repository: string,
  ): Effect.Effect<AISession[], Error> =>
    Effect.gen(function* () {
      const allSessions = yield* this.getAllSessions();
      return allSessions.filter((s) => s.repository?.includes(repository));
    });
}
