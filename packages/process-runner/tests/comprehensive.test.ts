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
          runDir: "/tmp/test-runs",
          logDir: "/tmp/test-logs",
        }),
      );

      expect(service).toBeInstanceOf(ProcessRunnerService);
    });

    it("should create runs with proper metadata", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      const run = await Effect.runPromise(
        service.newRun("test-run", "echo 'hello'"),
      );

      expect(run.runName).toBe("test-run");
      expect(run.command).toBe("echo 'hello'");
      expect(typeof run.pid).toBe("number");
      expect(run.pid).toBeGreaterThan(0);
      expect(run.logFile).toContain("test-run");
    });

    it("should list created runs", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Create a run
      await Effect.runPromise(service.newRun("list-test", "echo 'test'"));

      // List should include it
      const runs = await Effect.runPromise(service.listRuns());
      expect(runs.length).toBeGreaterThan(0);
      expect(runs.some((s) => s.runName === "list-test")).toBe(true);
    });

    it("should handle run killing", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Create and kill a run
      await Effect.runPromise(service.newRun("kill-test", "echo 'test'"));
      await Effect.runPromise(service.killRun("kill-test"));

      // Should be removed from list
      const runs = await Effect.runPromise(service.listRuns());
      expect(runs.some((s) => s.runName === "kill-test")).toBe(false);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle killing non-existent runs", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.killRun("non-existent")),
      ).rejects.toBeDefined();
    });

    it("should handle attaching to non-existent runs", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.attachRun("non-existent")),
      ).rejects.toBeDefined();
    });

    it("should reject empty run names", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      // Effect.runPromise rejects the promise when Effect fails
      await expect(
        Effect.runPromise(service.newRun("", "echo 'empty'")),
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

  describe("Run Metadata Types", () => {
    it("should validate ProcessRunInfo structure", async () => {
      const service = await Effect.runPromise(ProcessRunnerService.make());

      const run = await Effect.runPromise(
        service.newRun("type-test", "echo 'types'"),
      );

      expect(run).toHaveProperty("runName");
      expect(run).toHaveProperty("pid");
      expect(run).toHaveProperty("command");
      expect(run).toHaveProperty("logFile");
      // ptySocket is optional

      expect(typeof run.runName).toBe("string");
      expect(typeof run.pid).toBe("number");
      expect(typeof run.command).toBe("string");
      expect(typeof run.logFile).toBe("string");
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
        ProcessRunnerService.make({ runDir: "/tmp/test" }),
      );
      expect(service).toBeInstanceOf(ProcessRunnerService);
    });
  });
});
