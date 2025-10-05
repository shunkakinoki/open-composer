import { beforeAll, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import {
  type ClaudeCodeSession,
  parseClaudeCodeSessions,
} from "../src/sessions.js";

describe("Claude Code Sessions Parser", () => {
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

  test("reads sessions from JSONL files", async () => {
    const projectDir = path.join(__dirname, "fixtures", ".claude", "projects", "test-project");
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter(f => f.endsWith(".jsonl"));

    expect(jsonlFiles).toBeArray();
    expect(jsonlFiles.length).toBe(3);
    expect(jsonlFiles).toContain("session-1.jsonl");
  });

  test("parses session metadata correctly", async () => {
    const sessionFile = path.join(__dirname, "fixtures", ".claude", "projects", "test-project", "session-1.jsonl");
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBeGreaterThan(0);
    const firstEntry = JSON.parse(lines[1]);
    expect(firstEntry.cwd).toBe("/Users/test/projects/web-app");
    expect(firstEntry.sessionId).toBe("session-1");
    expect(firstEntry.gitBranch).toBe("main");
  });

  test("handles sessions with no messages", async () => {
    const sessionFile = path.join(__dirname, "fixtures", ".claude", "projects", "test-project", "session-3.jsonl");
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    const userMessages = lines.filter(line => {
      try {
        const entry = JSON.parse(line);
        return entry.type === "user" && entry.message?.role === "user";
      } catch {
        return false;
      }
    });

    expect(userMessages.length).toBe(0);
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

  test("generates correct summaries from first user message", async () => {
    const effect = parseClaudeCodeSessions();
    const sessions = await Effect.runPromise(effect);

    const session1 = sessions.find((s) => s.id === "session-1");
    expect(session1?.summary).toContain("Help me build a login form");

    const session2 = sessions.find((s) => s.id === "session-2");
    expect(session2?.summary).toContain("Create an API endpoint");

    const session3 = sessions.find((s) => s.id === "session-3");
    expect(session3?.summary).toBeUndefined();
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
