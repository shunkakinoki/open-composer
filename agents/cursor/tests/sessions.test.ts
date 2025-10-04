import { Database } from "bun:sqlite";
import { beforeAll, describe, expect, mock, test } from "bun:test";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import { type CursorSession, parseCursorSessions } from "../src/sessions.js";

describe("Cursor Sessions Parser", () => {
  const fixturesDir = path.join(__dirname, "fixtures", ".cursor", "chats");

  beforeAll(() => {
    // Mock homedir to point to our fixtures directory
    mock.module("node:os", () => ({
      homedir: () => path.join(__dirname, "fixtures"),
    }));
  });

  test("parseCursorSessions returns an Effect", () => {
    const result = parseCursorSessions();
    expect(result).toBeDefined();
  });

  test("reads SQLite store.db from session directory", () => {
    const dbPath = path.join(fixturesDir, "workspace-1/session-1/store.db");
    const db = new Database(dbPath, { readonly: true });

    const metaRows = db.query("SELECT key, value FROM meta").all() as Array<{
      key: string;
      value: string;
    }>;
    expect(metaRows.length).toBeGreaterThan(0);

    const blobCount = db.query("SELECT COUNT(*) as count FROM blobs").get() as {
      count: number;
    };
    expect(blobCount.count).toBe(3);

    db.close();
  });

  test("counts messages from blobs table", () => {
    const dbPath = path.join(fixturesDir, "workspace-1/session-2/store.db");
    const db = new Database(dbPath, { readonly: true });

    const blobCount = db.query("SELECT COUNT(*) as count FROM blobs").get() as {
      count: number;
    };
    expect(blobCount.count).toBe(2);

    db.close();
  });

  test("handles empty sessions", () => {
    const dbPath = path.join(fixturesDir, "workspace-2/session-3/store.db");
    const db = new Database(dbPath, { readonly: true });

    const blobCount = db.query("SELECT COUNT(*) as count FROM blobs").get() as {
      count: number;
    };
    expect(blobCount.count).toBe(0);

    db.close();
  });

  test("parses all fixture sessions successfully", async () => {
    const effect = parseCursorSessions();
    const sessions = await Effect.runPromise(effect);

    expect(sessions).toBeArray();
    expect(sessions.length).toBe(3);

    // Check that sessions have correct message counts in summary
    const session1 = sessions.find((s) => s.id.includes("session-1"));
    expect(session1?.summary).toContain("3 messages");

    const session2 = sessions.find((s) => s.id.includes("session-2"));
    expect(session2?.summary).toContain("2 messages");

    const session3 = sessions.find((s) => s.id.includes("session-3"));
    expect(session3?.summary).toContain("0 messages");
  });

  test("session type structure is correct", () => {
    const mockSession: CursorSession = {
      id: "cursor-workspace-1-session-1",
      agent: "cursor-agent",
      timestamp: new Date(),
      cwd: "/Users/test/.cursor/chats/workspace-1",
      summary: "Cursor chat: 5 messages",
      status: "completed",
    };

    expect(mockSession.agent).toBe("cursor-agent");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(mockSession.status).toBe("completed");
    expect(["cursor", "cursor-agent"]).toContain(mockSession.agent);
  });

  test("determines status based on message count", async () => {
    const effect = parseCursorSessions();
    const sessions = await Effect.runPromise(effect);

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const activeSessions = sessions.filter((s) => s.status === "active");

    // Sessions with messages should be completed
    expect(completedSessions.length).toBe(2);

    // Session with no messages should be active
    expect(activeSessions.length).toBe(1);
  });
});
