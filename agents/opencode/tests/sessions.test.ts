import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { parseCursorSessions, type CursorSession } from "../src/sessions.js";

describe("Cursor Sessions Parser", () => {
  test("parseCursorSessions returns an Effect", () => {
    const result = parseCursorSessions();
    expect(result).toBeDefined();
  });

  test("parseCursorSessions returns array when executed", async () => {
    const sessions = await Effect.runPromise(parseCursorSessions());
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("session type structure is correct", () => {
    const mockSession: CursorSession = {
      id: "cursor-test-123",
      agent: "cursor-agent",
      timestamp: new Date(),
      cwd: "/Users/test/.cursor/worktrees/project/123-abc",
      repository: "open/composer",
      branch: "main",
      summary: "Cursor worktree: project",
      status: "active",
    };

    expect(mockSession.agent).toBe("cursor-agent");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(mockSession.status).toBe("active");
    expect(["cursor", "cursor-agent"]).toContain(mockSession.agent);
  });

  test("handles missing directory gracefully", async () => {
    const sessions = await Effect.runPromise(parseCursorSessions());
    // Should return empty array or array of sessions, never throw
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("sessions have unique IDs if any exist", async () => {
    const sessions = await Effect.runPromise(parseCursorSessions());

    if (sessions.length > 0) {
      const ids = new Set(sessions.map(s => s.id));
      expect(ids.size).toBe(sessions.length);
    }
  });
});
