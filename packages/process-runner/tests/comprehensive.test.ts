import { describe, expect, it, mock } from "bun:test";
import * as Effect from "effect/Effect";
import { ProcessRunnerError, ProcessRunnerService } from "../src/core.js";

// Mock bun-pty to avoid native dependencies in tests
mock.module("bun-pty", () => ({
  spawn: mock(() => ({
    pid: 12345,
    onData: mock((callback: (data: string) => void) => {
      // Simulate some output
      setTimeout(() => callback("test output\n"), 10);
    }),
    onExit: mock((callback: (event: { exitCode: number }) => void) => {
      // Simulate process exiting
      setTimeout(() => callback({ exitCode: 0 }), 20);
    }),
    write: mock(() => {}),
    kill: mock(() => {}),
  })),
}));

// Mock child_process spawn for log display and process checking
mock.module("node:child_process", () => ({
  spawn: mock((_cmd: string, _args: string[]) => {
    // Create a mock EventEmitter-like object
    const mockChild = {
      on: mock((event: string, callback: (...args: unknown[]) => void) => {
        if (event === "close") {
          // Simulate successful command execution
          setTimeout(() => callback(0), 5);
        }
        return mockChild; // Allow chaining
      }),
      stdout: {
        on: mock(() => mockChild),
      },
      stderr: {
        on: mock(() => mockChild),
      },
    };
    return mockChild;
  }),
}));

// Mock fs to avoid actual file system operations
mock.module("node:fs", () => ({
  createWriteStream: mock((_path: string, _options?: unknown) => ({
    write: mock(() => true),
    end: mock(() => {}),
    on: mock(() => {}),
  })),
  existsSync: mock(() => true),
  mkdirSync: mock(() => {}),
}));

// In-memory store to simulate file system for tests
const mockFileStore = new Map<string, string>();

// Mock fs/promises to avoid actual file operations
mock.module("node:fs/promises", () => ({
  mkdir: mock(async () => {}),
  writeFile: mock(async (path: string, content: string) => {
    mockFileStore.set(path, content);
  }),
  readFile: mock(async (path: string) => {
    return mockFileStore.get(path) || "[]";
  }),
  access: mock(async (path: string) => {
    // Simulate that process is running (file exists) for test PIDs
    if (path.includes("/proc/12345")) {
      return Promise.resolve();
    }
    return Promise.reject(new Error("File not found"));
  }),
}));

// Mock process.platform to be 'linux' so isProcessRunning uses fs.access instead of child_process
Object.defineProperty(process, "platform", {
  writable: true,
  value: "linux",
});

describe("ProcessRunnerService - Comprehensive Tests", () => {
  describe("Core Functionality", () => {
    it("should create a service with custom configuration", async () => {
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir: "/tmp/test-sessions",
          logDir: "/tmp/test-logs",
        }),
      );

      expect(service).toBeInstanceOf(ProcessRunnerService);
    });

    it("should create sessions with proper metadata", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      const session = await Effect.runPromise(
        service.newSession("test-session", "echo 'hello'"),
      );

      expect(session.sessionName).toBe("test-session");
      expect(session.command).toBe("echo 'hello'");
      expect(typeof session.pid).toBe("number");
      expect(session.pid).toBeGreaterThan(0);
      expect(session.logFile).toContain("test-session");
    });

    it("should list created sessions", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Create a session
      await Effect.runPromise(service.newSession("list-test", "echo 'test'"));

      // List should include it
      const sessions = await Effect.runPromise(service.listSessions());
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.some((s) => s.sessionName === "list-test")).toBe(true);
    });

    it("should handle session killing", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Create and kill a session
      await Effect.runPromise(service.newSession("kill-test", "echo 'test'"));
      await Effect.runPromise(service.killSession("kill-test"));

      // Should be removed from list
      const sessions = await Effect.runPromise(service.listSessions());
      expect(sessions.some((s) => s.sessionName === "kill-test")).toBe(false);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle killing non-existent sessions", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.killSession("non-existent")),
      ).rejects.toBeDefined();
    });

    it("should handle attaching to non-existent sessions", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.attachSession("non-existent")),
      ).rejects.toBeDefined();
    });

    it("should reject empty session names", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.newSession("", "echo 'empty'")),
      ).rejects.toBeDefined();
    });
  });

  describe("ProcessRunnerError Type", () => {
    it("should create error objects with proper structure", () => {
      const error = ProcessRunnerError("Test error", 1, "stderr output");

      expect(error._tag).toBe("ProcessRunnerError");
      expect(error.message).toBe("Test error");
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toBe("stderr output");
    });

    it("should handle undefined exit code and stderr", () => {
      const error = ProcessRunnerError("Simple error");

      expect(error._tag).toBe("ProcessRunnerError");
      expect(error.message).toBe("Simple error");
      expect(error.exitCode).toBeUndefined();
      expect(error.stderr).toBeUndefined();
    });
  });

  describe("Session Metadata Types", () => {
    it("should validate ProcessSessionInfo structure", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      const session = await Effect.runPromise(
        service.newSession("type-test", "echo 'types'"),
      );

      expect(session).toHaveProperty("sessionName");
      expect(session).toHaveProperty("pid");
      expect(session).toHaveProperty("command");
      expect(session).toHaveProperty("logFile");
      // ptySocket is optional

      expect(typeof session.sessionName).toBe("string");
      expect(typeof session.pid).toBe("number");
      expect(typeof session.command).toBe("string");
      expect(typeof session.logFile).toBe("string");
    });
  });

  describe("Service Options", () => {
    it("should handle undefined options", async () => {
      const service = await Effect.runPromise(
        ProcessRunnerService.make(undefined),
      );
      expect(service).toBeInstanceOf(ProcessRunnerService);
    });

    it("should handle partial options", async () => {
      const service = await Effect.runPromise(
        ProcessRunnerService.make({ sessionDir: "/tmp/test" }),
      );
      expect(service).toBeInstanceOf(ProcessRunnerService);
    });
  });
});
