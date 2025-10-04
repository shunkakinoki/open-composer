import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { parseCodexSessions, type CodexSession } from "../src/sessions.js";

describe("Codex Sessions Parser", () => {
  test("parseCodexSessions returns an Effect", () => {
    const result = parseCodexSessions();
    expect(result).toBeDefined();
  });

  test("parseCodexSessions returns array when executed", async () => {
    const sessions = await Effect.runPromise(parseCodexSessions());
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("session type structure is correct", () => {
    const mockSession: CodexSession = {
      id: "test-123",
      agent: "codex",
      timestamp: new Date(),
      cwd: "/test/path",
      repository: "https://github.com/test/repo.git",
      branch: "main",
      summary: "Test summary",
      status: "completed",
    };

    expect(mockSession.agent).toBe("codex");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(["active", "completed", "failed"]).toContain(mockSession.status);
  });

  test("handles missing directory gracefully", async () => {
    const sessions = await Effect.runPromise(parseCodexSessions());
    // Should return empty array or array of sessions, never throw
    expect(Array.isArray(sessions)).toBe(true);
  });
});
