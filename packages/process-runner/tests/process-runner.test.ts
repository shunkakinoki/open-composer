import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import { ProcessRunnerService } from "../src/core.js";

// Mock bun-pty to avoid native dependencies in tests
mock.module("bun-pty", () => ({
  spawn: mock(() => ({
    pid: 12345,
    onData: mock((callback: (data: string) => void) => {
      setTimeout(() => callback("test output\n"), 10);
    }),
    onExit: mock((callback: (event: { exitCode: number }) => void) => {
      setTimeout(() => callback({ exitCode: 0 }), 20);
    }),
    write: mock(() => {}),
    kill: mock(() => {}),
  })),
}));

// Mock child_process spawn for log display and process checking
const childSpawnMock = mock((cmd: string, _args: string[]) => {
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
    command: cmd,
  };
  return mockChild;
});

mock.module("node:child_process", () => ({
  spawn: childSpawnMock,
}));

// Mock fs to avoid actual file system operations
const fsWatchMock = mock(
  (
    _path: string,
    options?:
      | { persistent?: boolean | undefined }
      | ((eventType: string, filename: string) => void),
    listener?: (eventType: string, filename: string) => void,
  ) => {
    const handlers = new Map<string, Array<(...args: unknown[]) => void>>();

    let actualListener:
      | ((eventType: string, filename: string) => void)
      | undefined;
    let watchOptions: { persistent?: boolean } | undefined;

    if (typeof options === "function") {
      actualListener = options;
      watchOptions = undefined;
    } else {
      watchOptions =
        options?.persistent !== undefined
          ? { persistent: options.persistent }
          : {};
      actualListener = listener;
    }

    if (actualListener) {
      setTimeout(() => actualListener("change", ""), 0);
    }

    const watcher = {
      on: mock((event: string, callback: (...args: unknown[]) => void) => {
        const existing = handlers.get(event) ?? [];
        existing.push(callback);
        handlers.set(event, existing);
        return watcher;
      }),
      close: mock(() => {
        const closeHandlers = handlers.get("close") ?? [];
        closeHandlers.forEach((handler) => {
          handler();
        });
      }),
      options: watchOptions,
    };

    // Auto-close shortly to allow effects to complete in tests
    setTimeout(() => watcher.close(), 10);

    return watcher;
  },
);

mock.module("node:fs", () => ({
  createWriteStream: mock((_path: string, _options?: unknown) => ({
    write: mock(() => true),
    end: mock(() => {}),
    on: mock(() => {}),
  })),
  watch: fsWatchMock,
}));

// In-memory store to simulate file system for tests
const mockFileStore = new Map<string, string>();
const runningProcesses = new Map<number, string>([[12345, "bash -c echo"]]);
const mockFileSizes = new Map<string, number>();

// Mock fs/promises to avoid actual file operations
mock.module("node:fs/promises", () => ({
  mkdir: mock(async () => {}),
  writeFile: mock(async (path: string, content: string) => {
    mockFileStore.set(path, content);
    mockFileSizes.set(path, Buffer.from(content).length);
  }),
  readFile: mock(async (path: string) => {
    const cmdlineMatch = path.match(/\/proc\/(\d+)\/cmdline$/);
    if (cmdlineMatch) {
      const pid = Number.parseInt(cmdlineMatch[1], 10);
      return runningProcesses.get(pid) ?? "";
    }
    return mockFileStore.get(path) || "[]";
  }),
  stat: mock(async (path: string) => ({
    size:
      mockFileSizes.get(path) ??
      Buffer.from(mockFileStore.get(path) ?? "").length,
  })),
  access: mock(async (path: string) => {
    const match = path.match(/\/proc\/(\d+)/);
    if (match) {
      const pid = Number.parseInt(match[1], 10);
      if (runningProcesses.has(pid)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("Process not found"));
    }
    return Promise.resolve();
  }),
  open: mock(async (path: string) => ({
    async stat() {
      return {
        size:
          mockFileSizes.get(path) ??
          Buffer.from(mockFileStore.get(path) ?? "").length,
      };
    },
    async read(
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) {
      const content = mockFileStore.get(path) ?? "";
      const slice = Buffer.from(content).slice(position, position + length);
      slice.copy(buffer, offset);
      return { bytesRead: slice.length, buffer };
    },
    async close() {},
  })),
}));

// Mock process.platform to be 'linux' so isProcessRunning uses fs.access instead of child_process
Object.defineProperty(process, "platform", {
  writable: true,
  value: "linux",
});

describe("ProcessRunnerService", () => {
  beforeEach(() => {
    mockFileStore.clear();
    mockFileSizes.clear();
    runningProcesses.clear();
    runningProcesses.set(12345, "bash -c echo");
    childSpawnMock.mockClear();
    fsWatchMock.mockClear();
  });

  it("should create a service instance", async () => {
    const result = await Effect.runPromise(ProcessRunnerService.make());
    expect(result).toBeInstanceOf(ProcessRunnerService);
  });

  it("should create and list sessions", async () => {
    const service = await Effect.runPromise(ProcessRunnerService.make());

    // Create a simple session
    const sessionResult = await Effect.runPromise(
      service.newSession("test-session", "echo 'hello world'"),
    );

    expect(sessionResult.sessionName).toBe("test-session");
    expect(sessionResult.command).toBe("echo 'hello world'");

    // List sessions
    const sessions = await Effect.runPromise(service.listSessions());
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.some((s) => s.sessionName === "test-session")).toBe(true);
  });

  it("should handle error cases gracefully", async () => {
    const service = await Effect.runPromise(ProcessRunnerService.make());

    // Test killing non-existent session
    await expect(
      Effect.runPromise(service.killSession("non-existent")),
    ).rejects.toBeDefined();

    // Test attaching to non-existent session
    await expect(
      Effect.runPromise(service.attachSession("non-existent")),
    ).rejects.toBeDefined();
  });

  it("should attach to the latest session entry when duplicates exist", async () => {
    const sessionDir = "/tmp/process-runner-duplicate-test";
    const sessionFile = path.join(sessionDir, "sessions.json");
    const oldPid = 11111;
    const newPid = 22222;

    mockFileStore.set(
      sessionFile,
      JSON.stringify(
        [
          {
            sessionName: "echo",
            pid: oldPid,
            command: "echo 'old'",
            logFile: "/tmp/echo-old.log",
          },
          {
            sessionName: "test",
            pid: 33333,
            command: "echo 'other'",
            logFile: "/tmp/test.log",
          },
          {
            sessionName: "echo",
            pid: newPid,
            command: "echo 'new'",
            logFile: "/tmp/echo-new.log",
          },
        ],
        null,
        2,
      ),
    );

    runningProcesses.set(newPid, "bash -c echo 'new'");

    const service = await Effect.runPromise(
      ProcessRunnerService.make({ sessionDir, logDir: "/tmp" }),
    );

    const sessions = await Effect.runPromise(service.listSessions());
    const echoSession = sessions.find(
      (session) => session.sessionName === "echo",
    );
    expect(echoSession?.pid).toBe(newPid);

    await expect(
      Effect.runPromise(service.attachSession("echo")),
    ).resolves.toBe(true);
  });

  it("should show stored logs for completed sessions", async () => {
    const sessionDir = "/tmp/process-runner-completed-session";
    const sessionFile = path.join(sessionDir, "sessions.json");
    const completedPid = 44444;

    mockFileStore.set(
      sessionFile,
      JSON.stringify(
        [
          {
            sessionName: "done",
            pid: completedPid,
            command: "echo 'done'",
            logFile: "/tmp/done.log",
          },
        ],
        null,
        2,
      ),
    );

    const service = await Effect.runPromise(
      ProcessRunnerService.make({ sessionDir, logDir: "/tmp" }),
    );

    await expect(
      Effect.runPromise(service.attachSession("done")),
    ).resolves.toBe(false);
  });
});
