/**
 * Run command streaming integration tests
 * Tests streaming command output through WebSocket to xterm
 */

import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { StreamingServerHandle } from "./websocket-server.js";
import { createStreamingServer } from "./websocket-server.js";
import { createStreamingTerminal, waitForText } from "./xterm-headless.js";

describe("Run Command Streaming", () => {
  let server: StreamingServerHandle;

  beforeEach(async () => {
    server = await createStreamingServer();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe("Command Execution", () => {
    test("streams echo command output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Execute command and stream output
      const child = spawn("echo", ["Hello, World!"]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      child.stderr?.on("data", (data) => {
        server.broadcast(`\x1b[31m${data.toString()}\x1b[0m`); // Red for errors
      });

      const received = await waitForText(terminal, "Hello, World!", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("streams multi-line command output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Execute command that outputs multiple lines
      const child = spawn("sh", [
        "-c",
        'echo "Line 1"; echo "Line 2"; echo "Line 3"',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      await waitForText(terminal, "Line 1", 2000);
      await waitForText(terminal, "Line 2", 2000);
      await waitForText(terminal, "Line 3", 2000);

      const lines = terminal.getLines();
      expect(lines.some((l) => l.includes("Line 1"))).toBe(true);
      expect(lines.some((l) => l.includes("Line 2"))).toBe(true);
      expect(lines.some((l) => l.includes("Line 3"))).toBe(true);

      terminal.dispose();
    });

    test("streams command with real-time output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Command that outputs over time
      const child = spawn("sh", [
        "-c",
        'for i in 1 2 3; do echo "Count: $i"; sleep 0.1; done',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      // Wait for each count to appear
      const found1 = await waitForText(terminal, "Count: 1", 2000);
      const found2 = await waitForText(terminal, "Count: 2", 2000);
      const found3 = await waitForText(terminal, "Count: 3", 2000);

      expect(found1).toBe(true);
      expect(found2).toBe(true);
      expect(found3).toBe(true);

      terminal.dispose();
    });

    test("streams stderr output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Command that outputs to stderr
      const child = spawn("sh", ["-c", 'echo "Error message" >&2']);

      child.stderr?.on("data", (data) => {
        server.broadcast(`\x1b[31m${data.toString()}\x1b[0m`);
      });

      const received = await waitForText(terminal, "Error message", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("handles command exit code", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      let exitCode: number | null = null;

      const child = spawn("sh", ["-c", "exit 42"]);

      child.on("close", (code) => {
        exitCode = code;
        server.broadcast(`\r\nProcess exited with code ${code}\r\n`);
      });

      await waitForText(terminal, "Process exited with code 42", 2000);

      expect(exitCode).toBe(42 as number | null);

      terminal.dispose();
    });

    test("streams directory listing", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("ls", ["-la"]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      child.stderr?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      // Wait for any output from ls command
      await new Promise((resolve) => setTimeout(resolve, 500));

      const lines = terminal.getLines();
      expect(lines.length).toBeGreaterThan(0);

      terminal.dispose();
    });

    test("streams command with ANSI colors", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Many CLI tools output ANSI colors
      const child = spawn("sh", [
        "-c",
        'printf "\\033[32mGreen\\033[0m \\033[31mRed\\033[0m\\n"',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      await waitForText(terminal, "Green", 2000);
      await waitForText(terminal, "Red", 2000);

      const lines = terminal.getLines();
      const output = lines.join(" ");
      expect(output).toContain("Green");
      expect(output).toContain("Red");

      terminal.dispose();
    });
  });

  describe("Process Control", () => {
    test("handles process termination", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Long-running command
      const child = spawn("sh", ["-c", "sleep 10"]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      // Kill after short delay
      setTimeout(() => {
        child.kill("SIGTERM");
        server.broadcast("\r\nProcess terminated\r\n");
      }, 200);

      const received = await waitForText(terminal, "Process terminated", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("handles process with stdin", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("cat");

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      // Write to stdin
      child.stdin?.write("Hello from stdin\n");
      child.stdin?.end();

      const received = await waitForText(terminal, "Hello from stdin", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });
  });

  describe("Complex Scenarios", () => {
    test("streams build command output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate a build command
      const child = spawn("sh", [
        "-c",
        'echo "Building..."; echo "Compiling src/main.ts"; echo "✓ Build complete"',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      await waitForText(terminal, "Building", 2000);
      await waitForText(terminal, "Compiling", 2000);
      await waitForText(terminal, "Build complete", 2000);

      const lines = terminal.getLines();
      expect(lines.some((l) => l.includes("Building"))).toBe(true);
      expect(lines.some((l) => l.includes("Compiling"))).toBe(true);
      expect(lines.some((l) => l.includes("Build complete"))).toBe(true);

      terminal.dispose();
    });

    test("streams test runner output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate test runner
      const child = spawn("sh", [
        "-c",
        'echo "Running tests..."; echo "✓ Test 1 passed"; echo "✓ Test 2 passed"; echo "All tests passed!"',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      await waitForText(terminal, "Running tests", 2000);
      await waitForText(terminal, "Test 1 passed", 2000);
      await waitForText(terminal, "Test 2 passed", 2000);
      await waitForText(terminal, "All tests passed", 2000);

      const output = terminal.getLines().join(" ");
      expect(output).toContain("Running tests");
      expect(output).toContain("All tests passed");

      terminal.dispose();
    });

    test("streams git command output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("git", ["--version"]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      child.stderr?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      const received = await waitForText(terminal, "git version", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("streams npm/bun command output", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("bun", ["--version"]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      const received = await waitForText(terminal, "1.", 2000); // Version starts with number
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("handles command with progress bar", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate progress bar
      const child = spawn("sh", [
        "-c",
        'for i in 0 25 50 75 100; do printf "\\rProgress: [$i%%]"; sleep 0.05; done; echo',
      ]);

      child.stdout?.on("data", (data) => {
        server.broadcast(data.toString());
      });

      await waitForText(terminal, "Progress:", 2000);
      await waitForText(terminal, "100", 2000);

      const output = terminal.getLines().join(" ");
      expect(output).toContain("Progress:");

      terminal.dispose();
    });
  });

  describe("Error Handling", () => {
    test("handles command not found", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("nonexistent-command-12345");

      child.on("error", (error) => {
        server.broadcast(`\x1b[31mError: ${error.message}\x1b[0m\r\n`);
      });

      const received = await waitForText(terminal, "Error:", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });

    test("handles command timeout", async () => {
      const terminal = await createStreamingTerminal(server.url);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = spawn("sleep", ["10"]);

      // Set timeout
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        server.broadcast("\x1b[31mCommand timed out\x1b[0m\r\n");
      }, 500);

      child.on("close", () => {
        clearTimeout(timeout);
      });

      const received = await waitForText(terminal, "Command timed out", 2000);
      expect(received).toBe(true);

      terminal.dispose();
    });
  });
});
