import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import * as Effect from "effect/Effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";
import { Database } from "bun:sqlite";
import { readCursorSessionMessages } from "../src/sessions.js";

describe("readCursorSessionMessages", () => {
  const testWorkspace = "test-workspace-123";
  const testSession = "test-session-456";
  const testSessionId = `cursor-${testWorkspace}-${testSession}`;
  const dbPath = path.join(homedir(), ".cursor", "chats", testWorkspace, testSession, "store.db");

  beforeAll(async () => {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(path.join(homedir(), ".cursor", "chats", testWorkspace), { recursive: true, force: true });
  });

  it("should return empty array for non-existent session", async () => {
    const messages = await readCursorSessionMessages("cursor-nonexistent-test-session")
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should return empty array for Cursor Composer sessions", async () => {
    const messages = await readCursorSessionMessages("cursor-composer-test-123")
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should handle invalid session ID format", async () => {
    await expect(
      readCursorSessionMessages("invalid").pipe(Effect.runPromise)
    ).rejects.toThrow("Invalid Cursor session ID format");
  });

  it("should return placeholder message when database exists", async () => {
    // Create a test SQLite database
    const db = new Database(dbPath);

    db.run("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)");
    db.run("CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB)");

    // Insert some test data
    db.run("INSERT INTO meta (key, value) VALUES (?, ?)", [
      "0",
      Buffer.from(JSON.stringify({
        agentId: testSession,
        name: "Test Session"
      })).toString('hex')
    ]);

    // Insert some blob entries
    db.run("INSERT INTO blobs (id, data) VALUES (?, ?)", ["blob1", Buffer.from("test")]);
    db.run("INSERT INTO blobs (id, data) VALUES (?, ?)", ["blob2", Buffer.from("test")]);

    db.close();

    // Use the correctly formatted session ID with cursor- prefix
    const messages = await readCursorSessionMessages(`cursor-${testWorkspace}-${testSession}`)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("2 messages");
  });

  it("should return empty array when database has no blobs", async () => {
    const db = new Database(dbPath);

    db.run("DROP TABLE IF EXISTS blobs");
    db.run("CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB)");

    db.close();

    const messages = await readCursorSessionMessages(`cursor-${testWorkspace}-${testSession}`)
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should parse session ID correctly", async () => {
    const sessionId = "cursor-abc123-def456-ghi789";

    // This should not throw
    await expect(
      readCursorSessionMessages(sessionId).pipe(Effect.runPromise)
    ).resolves.toBeDefined();
  });

  it("should handle missing database file gracefully", async () => {
    const nonExistentId = "cursor-workspace-nonexistent-session";

    const messages = await readCursorSessionMessages(nonExistentId)
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });
});
