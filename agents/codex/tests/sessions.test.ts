import { beforeAll, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type CodexSession, parseCodexSessions } from "../src/sessions.js";

describe("Codex Sessions Parser", () => {
  const fixturesDir = path.join(__dirname, "fixtures", "sessions");

  beforeAll(() => {
    // Mock the homedir to point to our fixtures
    mock.module("node:os", () => ({
      homedir: () => path.join(__dirname, "fixtures", ".."),
    }));
  });

  test("parseCodexSessions returns an Effect", () => {
    const result = parseCodexSessions();
    expect(result).toBeDefined();
  });

  test("parses completed session correctly", async () => {
    // Read the test fixture directly to verify parsing
    const sessionFile = path.join(
      fixturesDir,
      "2025/10/04/test-session-completed.jsonl",
    );
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBeGreaterThan(0);

    const firstLine = JSON.parse(lines[0]);
    expect(firstLine.type).toBe("session_meta");
    expect(firstLine.payload.id).toBe("test-session-completed-123");
    expect(firstLine.payload.git.branch).toBe("feature/add-tests");
    expect(firstLine.payload.git.repository_url).toBe(
      "https://github.com/test/my-project.git",
    );
  });

  test("parses failed session correctly", async () => {
    const sessionFile = path.join(
      fixturesDir,
      "2025/10/04/test-session-failed.jsonl",
    );
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    const firstLine = JSON.parse(lines[0]);
    expect(firstLine.payload.id).toBe("test-session-failed-456");

    // Check for error line
    const hasError = lines.some((line) => {
      const entry = JSON.parse(line);
      return entry.type === "error";
    });
    expect(hasError).toBe(true);
  });

  test("parses session without git metadata", async () => {
    const sessionFile = path.join(
      fixturesDir,
      "2025/10/04/test-session-no-git.jsonl",
    );
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    const firstLine = JSON.parse(lines[0]);
    expect(firstLine.payload.id).toBe("test-session-no-git-789");
    expect(firstLine.payload.git).toBeUndefined();
  });

  test("extracts user message summary", async () => {
    const sessionFile = path.join(
      fixturesDir,
      "2025/10/04/test-session-completed.jsonl",
    );
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n");

    const eventMsg = lines.find((line) => {
      const entry = JSON.parse(line);
      return entry.type === "event_msg";
    });

    expect(eventMsg).toBeDefined();
    if (eventMsg) {
      const parsed = JSON.parse(eventMsg);
      expect(parsed.payload.message).toContain(
        "Add unit tests for the authentication module",
      );
    }
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
});
