import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { parseClaudeCodeSessions } from "../src/sessions.js";

describe("Claude Code Sessions Parser", () => {
  test("parseClaudeCodeSessions returns empty array (placeholder)", async () => {
    const result = await Effect.runPromise(parseClaudeCodeSessions());

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test("parseClaudeCodeSessions returns Effect type", () => {
    const effect = parseClaudeCodeSessions();

    expect(effect).toBeDefined();
    expect(typeof effect).toBe("object");
  });

  test("parsed sessions would have correct structure (future implementation)", async () => {
    const sessions = await Effect.runPromise(parseClaudeCodeSessions());

    // When implemented, sessions should have this structure
    sessions.forEach(session => {
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("agent");
      expect(session).toHaveProperty("timestamp");
      expect(session).toHaveProperty("status");

      expect(session.agent).toBe("claude-code");
      expect(session.timestamp).toBeInstanceOf(Date);
      expect(["active", "completed", "failed"]).toContain(session.status);
    });
  });
});
