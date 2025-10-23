import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import * as Effect from "effect/Effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";
import { readOpencodeSessionMessages } from "../src/read-messages.js";

describe("readOpencodeSessionMessages", () => {
  const testSessionId = "ses_test123abc";
  const testMessageId1 = "msg_test456def";
  const testMessageId2 = "msg_test789ghi";

  const getDataDir = () => {
    const xdgData = process.env.XDG_DATA_HOME || path.join(homedir(), ".local", "share");
    return path.join(xdgData, "opencode");
  };

  const storageDir = path.join(getDataDir(), "storage");
  const messageDir = path.join(storageDir, "message", testSessionId);
  const partDir = path.join(storageDir, "part");

  beforeAll(async () => {
    await fs.mkdir(messageDir, { recursive: true });
    await fs.mkdir(path.join(partDir, testMessageId1), { recursive: true });
    await fs.mkdir(path.join(partDir, testMessageId2), { recursive: true });
  });

  beforeEach(async () => {
    // Clean up any existing message and part files before each test
    const messageFiles = await fs.readdir(messageDir, { withFileTypes: true }).catch(() => []);
    for (const file of messageFiles) {
      if (file.isFile()) {
        await fs.rm(path.join(messageDir, file.name), { force: true });
      }
    }

    const partDirs = [
      path.join(partDir, testMessageId1),
      path.join(partDir, testMessageId2)
    ];

    for (const dir of partDirs) {
      const partFiles = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const file of partFiles) {
        if (file.isFile()) {
          await fs.rm(path.join(dir, file.name), { force: true });
        }
      }
    }
  });

  afterAll(async () => {
    await fs.rm(messageDir, { recursive: true, force: true });
    await fs.rm(path.join(partDir, testMessageId1), { recursive: true, force: true });
    await fs.rm(path.join(partDir, testMessageId2), { recursive: true, force: true });
  });

  it("should return empty array for non-existent session", async () => {
    const messages = await readOpencodeSessionMessages("ses_nonexistent")
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should parse messages with text parts", async () => {
    // Create message files
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "user",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    await fs.writeFile(
      path.join(messageDir, `${testMessageId2}.json`),
      JSON.stringify({
        id: testMessageId2,
        role: "assistant",
        sessionID: testSessionId,
        time: { created: 2000 }
      })
    );

    // Create part files
    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Can you help me?",
        time: { start: 1000, end: 1001 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId2, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId2,
        sessionID: testSessionId,
        type: "text",
        text: "Of course!",
        time: { start: 2000, end: 2001 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "user",
      content: "Can you help me?",
      timestamp: 1000
    });
    expect(messages[1]).toMatchObject({
      role: "assistant",
      content: "Of course!",
      timestamp: 2000
    });
  });

  it("should combine multiple text parts", async () => {
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "assistant",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    // Create multiple text parts
    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "First part",
        time: { start: 1000, end: 1001 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Second part",
        time: { start: 1002, end: 1003 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toContain("First part");
    expect(messages[0].content).toContain("Second part");
  });

  it("should include tool invocations", async () => {
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "assistant",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Let me read that file",
        time: { start: 1000, end: 1001 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "tool-invocation",
        toolInvocation: {
          toolName: "Read",
          args: { file_path: "/test/file.ts" },
          result: "File contents"
        },
        time: { start: 1002, end: 1003 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Let me read that file");
    expect(messages[0].toolCalls).toBeDefined();
    expect(messages[0].toolCalls).toHaveLength(1);
    expect(messages[0].toolCalls[0].toolName).toBe("Read");
  });

  it("should sort parts by time", async () => {
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "assistant",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    // Write parts in reverse order
    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_003.json"),
      JSON.stringify({
        id: "prt_003",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Third",
        time: { start: 1003, end: 1004 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "First",
        time: { start: 1001, end: 1002 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Second",
        time: { start: 1002, end: 1003 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("First\nSecond\nThird");
  });

  it("should skip non-text and non-tool-invocation parts", async () => {
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "assistant",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "step-start",
        time: { start: 1000, end: 1001 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Actual text",
        time: { start: 1001, end: 1002 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Actual text");
  });

  it("should sort messages by timestamp", async () => {
    await fs.writeFile(
      path.join(messageDir, `${testMessageId1}.json`),
      JSON.stringify({
        id: testMessageId1,
        role: "user",
        sessionID: testSessionId,
        time: { created: 2000 }
      })
    );

    await fs.writeFile(
      path.join(messageDir, `${testMessageId2}.json`),
      JSON.stringify({
        id: testMessageId2,
        role: "user",
        sessionID: testSessionId,
        time: { created: 1000 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId1, "prt_001.json"),
      JSON.stringify({
        id: "prt_001",
        messageID: testMessageId1,
        sessionID: testSessionId,
        type: "text",
        text: "Second",
        time: { start: 2000, end: 2001 }
      })
    );

    await fs.writeFile(
      path.join(partDir, testMessageId2, "prt_002.json"),
      JSON.stringify({
        id: "prt_002",
        messageID: testMessageId2,
        sessionID: testSessionId,
        type: "text",
        text: "First",
        time: { start: 1000, end: 1001 }
      })
    );

    const messages = await readOpencodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("First");
    expect(messages[1].content).toBe("Second");
  });
});
