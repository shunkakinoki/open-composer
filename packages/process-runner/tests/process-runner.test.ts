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

  it("should create and list runs", async () => {
    const service = await Effect.runPromise(ProcessRunnerService.make());

    // Create a simple run
    const runResult = await Effect.runPromise(
      service.newRun("test-run", "echo 'hello world'"),
    );

    expect(runResult.runName).toBe("test-run");
    expect(runResult.command).toBe("echo 'hello world'");

    // List runs
    const runs = await Effect.runPromise(service.listRuns());
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.some((s) => s.runName === "test-run")).toBe(true);
  });

  it("should handle error cases gracefully", async () => {
    const service = await Effect.runPromise(ProcessRunnerService.make());

    // Test killing non-existent run
    await expect(
      Effect.runPromise(service.killRun("non-existent")),
    ).rejects.toBeDefined();

    // Test attaching to non-existent run
    await expect(
      Effect.runPromise(service.attachRun("non-existent")),
    ).rejects.toBeDefined();
  });

  it("should attach to the latest run entry when duplicates exist", async () => {
    const runDir = "/tmp/process-runner-duplicate-test";
    const runFile = path.join(runDir, "runs.json");
    const oldPid = 11111;
    const newPid = 22222;

    mockFileStore.set(
      runFile,
      JSON.stringify(
        [
          {
            runName: "echo",
            pid: oldPid,
            command: "echo 'old'",
            logFile: "/tmp/echo-old.log",
          },
          {
            runName: "test",
            pid: 33333,
            command: "echo 'other'",
            logFile: "/tmp/test.log",
          },
          {
            runName: "echo",
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
      ProcessRunnerService.make({ runDir, logDir: "/tmp" }),
    );

    const runs = await Effect.runPromise(service.listRuns());
    const echoRun = runs.find(
      (run) => run.runName === "echo",
    );
    expect(echoRun?.pid).toBe(newPid);

    await expect(
      Effect.runPromise(service.attachRun("echo")),
    ).resolves.toBe(true);
  });

  it("should show stored logs for completed runs", async () => {
    const runDir = "/tmp/process-runner-completed-run";
    const runFile = path.join(runDir, "runs.json");
    const completedPid = 44444;

    mockFileStore.set(
      runFile,
      JSON.stringify(
        [
          {
            runName: "done",
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
      ProcessRunnerService.make({ runDir, logDir: "/tmp" }),
    );

    await expect(
      Effect.runPromise(service.attachRun("done")),
    ).resolves.toBe(false);
  });
});
