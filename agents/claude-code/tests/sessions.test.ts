import { beforeAll, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import {
  type ClaudeCodeSession,
  parseClaudeCodeSessions,
} from "../src/sessions.js";

describe("Claude Code Sessions Parser", () => {
  const fixturesDir = path.join(__dirname, "fixtures", ".claude-code");

  beforeAll(() => {
    // Mock homedir to point to our fixtures directory
    mock.module("node:os", () => ({
      homedir: () => path.join(__dirname, "fixtures"),
    }));
  });

  test("parseClaudeCodeSessions returns an Effect", () => {
    const result = parseClaudeCodeSessions();
    expect(result).toBeDefined();
  });

  test("reads sessions from JSON cache file", async () => {
    const cacheFile = path.join(fixturesDir, "sessions.json");
    const content = await fs.readFile(cacheFile, "utf-8");
    const data = JSON.parse(content);

    expect(data).toBeArray();
    expect(data.length).toBe(3);
    expect(data[0].id).toBe("session-1");
  });

  test("parses session metadata correctly", async () => {
    const cacheFile = path.join(fixturesDir, "sessions.json");
    const content = await fs.readFile(cacheFile, "utf-8");
    const data = JSON.parse(content);

    expect(data[0].timestamp).toBe(1704067200000);
    expect(data[0].cwd).toBe("/Users/test/projects/web-app");
    expect(data[0].repository).toBe("user/web-app");
    expect(data[0].branch).toBe("main");
    expect(data[0].messageCount).toBe(5);
  });

  test("handles sessions with no messages", async () => {
    const cacheFile = path.join(fixturesDir, "sessions.json");
    const content = await fs.readFile(cacheFile, "utf-8");
    const data = JSON.parse(content);

    const emptySession = data.find((s: any) => s.messageCount === 0);
    expect(emptySession).toBeDefined();
    expect(emptySession.id).toBe("session-3");
  });

  test("parses all fixture sessions successfully", async () => {
    const effect = parseClaudeCodeSessions();
    const sessions = await Effect.runPromise(effect);

    expect(sessions).toBeArray();
    expect(sessions.length).toBe(3);

    // Check sessions are sorted by timestamp (newest first)
    expect(sessions[0]?.timestamp.getTime()).toBeGreaterThanOrEqual(
      sessions[1]?.timestamp.getTime() || 0,
    );
  });

  test("generates correct summaries with message counts", async () => {
    const effect = parseClaudeCodeSessions();
    const sessions = await Effect.runPromise(effect);

    const session1 = sessions.find((s) => s.id === "session-1");
    expect(session1?.summary).toContain("5 messages");

    const session2 = sessions.find((s) => s.id === "session-2");
    expect(session2?.summary).toContain("3 messages");

    const session3 = sessions.find((s) => s.id === "session-3");
    expect(session3?.summary).toBe("Claude Code session");
  });

  test("determines status based on message count", async () => {
    const effect = parseClaudeCodeSessions();
    const sessions = await Effect.runPromise(effect);

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const activeSessions = sessions.filter((s) => s.status === "active");

    // Sessions with messages should be completed
    expect(completedSessions.length).toBe(2);

    // Session with no messages should be active
    expect(activeSessions.length).toBe(1);
  });

  test("session type structure is correct", () => {
    const mockSession: ClaudeCodeSession = {
      id: "test-session",
      agent: "claude-code",
      timestamp: new Date(1704067200000),
      cwd: "/Users/test/projects/my-app",
      repository: "user/my-app",
      branch: "main",
      summary: "Claude Code session: 5 messages",
      status: "completed",
    };

    expect(mockSession.agent).toBe("claude-code");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(mockSession.status).toBe("completed");
  });
});
