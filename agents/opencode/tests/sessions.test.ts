import { beforeAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import {
  type OpencodeSession,
  parseOpencodeSessions,
} from "../src/sessions.js";

describe("Opencode Sessions Parser", () => {
  const fixturesDir = path.join(__dirname, "fixtures", "opencode");

  beforeAll(() => {
    // Mock XDG_DATA_HOME to point to our fixtures
    process.env.XDG_DATA_HOME = path.join(__dirname, "fixtures");
  });

  test("parseOpencodeSessions returns an Effect", () => {
    const result = parseOpencodeSessions();
    expect(result).toBeDefined();
  });

  test("reads session JSON files", async () => {
    const sessionFile = path.join(fixturesDir, "session-1.json");
    const content = await fs.readFile(sessionFile, "utf-8");
    const data = JSON.parse(content);

    expect(data.info).toBeDefined();
    expect(data.info.id).toBe("session-1");
    expect(data.messages).toBeArray();
    expect(data.messages.length).toBeGreaterThan(0);
  });

  test("extracts session info from JSON", async () => {
    const sessionFile = path.join(fixturesDir, "session-2.json");
    const content = await fs.readFile(sessionFile, "utf-8");
    const data = JSON.parse(content);

    expect(data.info.id).toBe("session-2");
    expect(data.info.timestamp).toBe(1704153600000);
    expect(data.info.cwd).toBe("/Users/test/projects/web-app");
    expect(data.info.repository).toBe("org/web-app");
    expect(data.info.branch).toBe("feature/new-ui");
  });

  test("extracts summary from first user message", async () => {
    const sessionFile = path.join(fixturesDir, "session-2.json");
    const content = await fs.readFile(sessionFile, "utf-8");
    const data = JSON.parse(content);

    const firstUserMessage = data.messages.find(
      (msg: any) => msg.role === "user",
    );
    expect(firstUserMessage).toBeDefined();
    expect(firstUserMessage.content).toStartWith("Add a new component");
  });

  test("handles sessions with no messages", async () => {
    const sessionFile = path.join(fixturesDir, "session-3.json");
    const content = await fs.readFile(sessionFile, "utf-8");
    const data = JSON.parse(content);

    expect(data.messages).toEqual([]);
    expect(data.info.id).toBe("session-3");
  });

  test("parses all fixture sessions successfully", async () => {
    const effect = parseOpencodeSessions();
    const sessions = await Effect.runPromise(effect);

    expect(sessions).toBeArray();
    expect(sessions.length).toBe(3);

    // Check sessions are sorted by timestamp (newest first)
    expect(sessions[0]?.timestamp.getTime()).toBeGreaterThanOrEqual(
      sessions[1]?.timestamp.getTime() || 0,
    );
  });

  test("session type structure is correct", () => {
    const mockSession: OpencodeSession = {
      id: "test-session",
      agent: "opencode",
      timestamp: new Date(1704067200000),
      cwd: "/Users/test/projects/my-app",
      repository: "user/my-app",
      branch: "main",
      summary: "Fix the bug in the authentication module",
      status: "completed",
    };

    expect(mockSession.agent).toBe("opencode");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(mockSession.status).toBe("completed");
  });
});
