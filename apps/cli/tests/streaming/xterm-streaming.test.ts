/**
 * XTerm streaming tests
 * Tests xterm.js headless integration with WebSocket streaming
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { StreamingServerHandle } from "./websocket-server.js";
import { createStreamingServer } from "./websocket-server.js";
import {
  createHeadlessTerminal,
  createStreamingTerminal,
  waitForLines,
  waitForText,
} from "./xterm-headless.js";

describe("XTerm Streaming", () => {
  let server: StreamingServerHandle;

  beforeEach(async () => {
    server = await createStreamingServer();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe("Headless Terminal", () => {
    test("creates headless terminal with default size", async () => {
      const terminal = await createHeadlessTerminal();

      expect(terminal.terminal.cols).toBe(80);
      expect(terminal.terminal.rows).toBe(24);

      terminal.dispose();
    });

    test("creates headless terminal with custom size", async () => {
      const terminal = await createHeadlessTerminal({
        cols: 100,
        rows: 30,
      });

      expect(terminal.terminal.cols).toBe(100);
      expect(terminal.terminal.rows).toBe(30);

      terminal.dispose();
    });

    test("writes text to terminal", async () => {
      const terminal = await createHeadlessTerminal();

      terminal.write("Hello, Terminal!");

      // Wait for terminal to process write
      await new Promise((resolve) => setTimeout(resolve, 50));

      const lines = terminal.getLines();
      expect(lines[0]).toContain("Hello, Terminal!");

      terminal.dispose();
    });

    test("captures terminal output", async () => {
      const terminal = await createHeadlessTerminal();

      // Simulate user input (terminal.onData captures it)
      terminal.terminal.onData((data) => {
        terminal.output.push(data);
      });

      // Write some data
      terminal.write("Test output");

      expect(terminal.getOutput()).toBeDefined();

      terminal.dispose();
    });

    test("resizes terminal", async () => {
      const terminal = await createHeadlessTerminal();

      terminal.resize(120, 40);

      expect(terminal.terminal.cols).toBe(120);
      expect(terminal.terminal.rows).toBe(40);

      terminal.dispose();
    });

    test("clears terminal output", async () => {
      const terminal = await createHeadlessTerminal();

      terminal.write("Line 1\r\n");
      terminal.write("Line 2\r\n");

      expect(terminal.getLines().length).toBeGreaterThan(0);

      terminal.clear();

      const output = terminal.getOutput();
      expect(output).toBe("");

      terminal.dispose();
    });

    test("handles multiple lines", async () => {
      const terminal = await createHeadlessTerminal();

      terminal.write("Line 1\r\n");
      terminal.write("Line 2\r\n");
      terminal.write("Line 3\r\n");

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lines = terminal.getLines();
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines[0]).toContain("Line 1");
      expect(lines[1]).toContain("Line 2");
      expect(lines[2]).toContain("Line 3");

      terminal.dispose();
    });

    test("handles ANSI escape codes", async () => {
      const terminal = await createHeadlessTerminal();

      // Write colored text
      terminal.write("\x1b[31mRed Text\x1b[0m");
      terminal.write("\x1b[1mBold Text\x1b[0m");

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lines = terminal.getLines();
      expect(lines[0]).toContain("Red Text");
      expect(lines[0]).toContain("Bold Text");

      terminal.dispose();
    });
  });

  describe("WebSocket Streaming", () => {
    test("connects terminal to WebSocket", async () => {
      const terminal = await createStreamingTerminal(server.url);

      // Terminal should be connected
      expect(terminal.terminal).toBeDefined();

      terminal.dispose();
    });

    test("receives messages from WebSocket", async () => {
      const terminal = await createStreamingTerminal(server.url);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send message from server
      server.broadcast("Hello from WebSocket!\r\n");

      // Wait for message to be received
      const received = await waitForText(terminal, "Hello from WebSocket!", 2000);

      expect(received).toBe(true);

      const lines = terminal.getLines();
      const hasMessage = lines.some((line) =>
        line.includes("Hello from WebSocket!"),
      );
      expect(hasMessage).toBe(true);

      terminal.dispose();
    });

    test("receives multiple messages", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      server.broadcast("Line 1\r\n");
      server.broadcast("Line 2\r\n");
      server.broadcast("Line 3\r\n");

      const received = await waitForLines(terminal, 3, 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("handles streaming output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate streaming command output
      const lines = [
        "Starting process...\r\n",
        "Loading configuration...\r\n",
        "Initializing...\r\n",
        "Ready!\r\n",
      ];

      for (const line of lines) {
        server.broadcast(line);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      await waitForText(terminal, "Ready!", 2000);

      const terminalLines = terminal.getLines();
      expect(terminalLines.some((l) => l.includes("Starting process"))).toBe(
        true,
      );
      expect(terminalLines.some((l) => l.includes("Ready!"))).toBe(true);

      terminal.dispose();
    });

    test("handles colored output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send ANSI colored text
      server.broadcast("\x1b[32mSuccess!\x1b[0m\r\n");
      server.broadcast("\x1b[31mError!\x1b[0m\r\n");

      await waitForText(terminal, "Success!", 2000);
      await waitForText(terminal, "Error!", 2000);

      const lines = terminal.getLines();
      expect(lines.some((l) => l.includes("Success"))).toBe(true);
      expect(lines.some((l) => l.includes("Error"))).toBe(true);

      terminal.dispose();
    });

    test("handles rapid streaming", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send many messages rapidly
      for (let i = 0; i < 50; i++) {
        server.broadcast(`Line ${i}\r\n`);
      }

      await waitForText(terminal, "Line 49", 2000);

      const lines = terminal.getLines();
      const hasFirstLine = lines.some((l) => l.includes("Line 0"));
      const hasLastLine = lines.some((l) => l.includes("Line 49"));

      expect(hasFirstLine).toBe(true);
      expect(hasLastLine).toBe(true);

      terminal.dispose();
    });

    test("handles progress indicators", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate progress bar
      for (let i = 0; i <= 100; i += 10) {
        const bar = "█".repeat(i / 10) + "░".repeat(10 - i / 10);
        server.broadcast(`\rProgress: [${bar}] ${i}%`);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      await waitForText(terminal, "100%", 2000);

      const output = terminal.getLines().join(" ");
      expect(output).toContain("100%");

      terminal.dispose();
    });
  });

  describe("Wait Utilities", () => {
    test("waitForText returns true when text appears", async () => {
      const terminal = await createHeadlessTerminal();

      // Write text after a delay
      setTimeout(() => {
        terminal.write("Expected text here");
      }, 100);

      const found = await waitForText(terminal, "Expected text", 2000);

      expect(found).toBe(true);

      terminal.dispose();
    });

    test("waitForText returns false on timeout", async () => {
      const terminal = await createHeadlessTerminal();

      const found = await waitForText(terminal, "Never appears", 500);

      expect(found).toBe(false);

      terminal.dispose();
    });

    test("waitForLines returns true when line count reached", async () => {
      const terminal = await createHeadlessTerminal();

      // Add lines after delay
      setTimeout(() => {
        terminal.write("Line 1\r\n");
        terminal.write("Line 2\r\n");
        terminal.write("Line 3\r\n");
      }, 100);

      const found = await waitForLines(terminal, 3, 2000);

      expect(found).toBe(true);

      terminal.dispose();
    });

    test("waitForLines returns false on timeout", async () => {
      const terminal = await createHeadlessTerminal({ rows: 5 });

      terminal.write("Line 1\r\n");

      // Wait for write to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const currentLines = terminal.getLines().length;

      // Now wait for more lines than currently exist
      const found = await waitForLines(terminal, currentLines + 10, 500);

      expect(found).toBe(false);

      terminal.dispose();
    });
  });
});
