/**
 * WebSocket streaming tests
 * Tests WebSocket server and client functionality for terminal streaming
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { StreamingServerHandle } from "./websocket-server.js";
import {
  collectMessages,
  createStreamingClient,
  createStreamingServer,
} from "./websocket-server.js";

describe("WebSocket Streaming", () => {
  let server: StreamingServerHandle;

  beforeEach(async () => {
    server = await createStreamingServer();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  test("creates WebSocket server with random port", () => {
    expect(server.port).toBeGreaterThan(0);
    expect(server.url).toContain(`ws://localhost:${server.port}`);
  });

  test("accepts WebSocket connections", async () => {
    const ws = await createStreamingClient(server.url);
    expect(ws.readyState).toBe(1); // WebSocket.OPEN

    ws.close();
  });

  test("broadcasts messages to all connected clients", async () => {
    const ws1 = await createStreamingClient(server.url);
    const ws2 = await createStreamingClient(server.url);

    const messages1: string[] = [];
    const messages2: string[] = [];

    ws1.on("message", (data) => messages1.push(data.toString()));
    ws2.on("message", (data) => messages2.push(data.toString()));

    // Wait a bit for connections to stabilize
    await new Promise((resolve) => setTimeout(resolve, 50));

    server.broadcast("Hello from server!");

    // Wait for messages to be received
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages1).toContain("Hello from server!");
    expect(messages2).toContain("Hello from server!");

    ws1.close();
    ws2.close();
  });

  test("tracks connected clients", async () => {
    expect(server.getClients().size).toBe(0);

    const ws1 = await createStreamingClient(server.url);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.getClients().size).toBe(1);

    const ws2 = await createStreamingClient(server.url);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.getClients().size).toBe(2);

    ws1.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.getClients().size).toBe(1);

    ws2.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.getClients().size).toBe(0);
  });

  test("collects messages with timeout", async () => {
    const ws = await createStreamingClient(server.url);

    const messagesPromise = collectMessages(ws, 1000);

    server.broadcast("Message 1");
    server.broadcast("Message 2");
    server.broadcast("Message 3");

    const messages = await messagesPromise;

    expect(messages).toContain("Message 1");
    expect(messages).toContain("Message 2");
    expect(messages).toContain("Message 3");

    ws.close();
  });

  test("handles binary data", async () => {
    const ws = await createStreamingClient(server.url);

    const messages: string[] = [];
    ws.on("message", (data) => messages.push(data.toString()));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    for (const client of server.getClients()) {
      client.send(binaryData);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages[0]).toBe("Hello");

    ws.close();
  });

  test("handles rapid message sending", async () => {
    const ws = await createStreamingClient(server.url);
    const messages: string[] = [];

    ws.on("message", (data) => messages.push(data.toString()));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Send 100 messages rapidly
    for (let i = 0; i < 100; i++) {
      server.broadcast(`Message ${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(messages.length).toBe(100);
    expect(messages[0]).toBe("Message 0");
    expect(messages[99]).toBe("Message 99");

    ws.close();
  });

  test("handles client disconnection gracefully", async () => {
    const ws = await createStreamingClient(server.url);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(server.getClients().size).toBe(1);

    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(server.getClients().size).toBe(0);

    // Should not throw when broadcasting to no clients
    expect(() => server.broadcast("Test")).not.toThrow();
  });

  test("creates server with custom path", async () => {
    const customServer = await createStreamingServer({ path: "/custom" });

    expect(customServer.url).toContain("/custom");

    const ws = await createStreamingClient(customServer.url);
    expect(ws.readyState).toBe(1);

    ws.close();
    await customServer.close();
  });

  test("handles ANSI escape codes", async () => {
    const ws = await createStreamingClient(server.url);
    const messages: string[] = [];

    ws.on("message", (data) => messages.push(data.toString()));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Send ANSI colored text
    server.broadcast("\x1b[31mRed Text\x1b[0m");
    server.broadcast("\x1b[1mBold Text\x1b[0m");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages[0]).toContain("\x1b[31m");
    expect(messages[0]).toContain("Red Text");
    expect(messages[1]).toContain("\x1b[1m");
    expect(messages[1]).toContain("Bold Text");

    ws.close();
  });
});
