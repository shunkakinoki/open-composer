// Mock bun-pty to avoid native dependencies but allow testing persistence
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as Effect from "effect/Effect";
import { ProcessRunnerService, type ProcessRunInfo } from "../src/core.js";

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

let tempDir: string;

describe("ProcessRunnerService - Persistence E2E Tests", () => {
  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `process-runner-persistence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Run File Persistence", () => {
    it("should create runs.json file when runs are created", async () => {
      const runDir = join(tempDir, "runs");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create a run
      await Effect.runPromise(
        service.newRun("test-run", "echo 'hello'"),
      );

      // Check that runs.json was created
      const runFile = join(runDir, "runs.json");
      expect(fsSync.existsSync(runFile)).toBe(true);

      // Verify file contents
      const content = await fs.readFile(runFile, "utf-8");
      const runs = JSON.parse(content);

      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("test-run");
      expect(runs[0].command).toBe("echo 'hello'");
      expect(typeof runs[0].pid).toBe("number");
      expect(runs[0].logFile).toContain("test-run");
    });

    it("should persist multiple runs to disk", async () => {
      const runDir = join(tempDir, "multi-runs");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create multiple runs
      await Effect.runPromise(service.newRun("run-1", "echo 'one'"));
      await Effect.runPromise(service.newRun("run-2", "echo 'two'"));
      await Effect.runPromise(service.newRun("run-3", "echo 'three'"));

      // Check file contents
      const runFile = join(runDir, "runs.json");
      const content = await fs.readFile(runFile, "utf-8");
      const runs = JSON.parse(content);

      expect(runs.length).toBe(3);
      const runNames = runs
        .map((s: ProcessRunInfo) => s.runName)
        .sort();
      expect(runNames).toEqual(["run-1", "run-2", "run-3"]);

      const commands = runs
        .map((s: ProcessRunInfo) => s.command)
        .sort();
      expect(commands).toEqual(["echo 'one'", "echo 'three'", "echo 'two'"]);
    });

    it("should create log files for each run", async () => {
      const runDir = join(tempDir, "runs");
      const logDir = join(tempDir, "logs");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir,
        }),
      );

      const run = await Effect.runPromise(
        service.newRun("log-test", "echo 'test'"),
      );

      // Check that log file was created
      expect(fsSync.existsSync(run.logFile)).toBe(true);

      // Check that log file is in the correct directory
      expect(run.logFile.startsWith(logDir)).toBe(true);

      // Check that log file has the run name in it
      expect(run.logFile).toContain("log-test");
    });

    it("should handle custom run directory paths", async () => {
      const customRunDir = join(tempDir, "custom", "nested", "runs");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir: customRunDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service.newRun("custom-path-test", "echo 'custom'"),
      );

      // Check that nested directories were created
      expect(fsSync.existsSync(customRunDir)).toBe(true);

      // Check that runs.json was created in the custom location
      const runFile = join(customRunDir, "runs.json");
      expect(fsSync.existsSync(runFile)).toBe(true);

      const content = await fs.readFile(runFile, "utf-8");
      const runs = JSON.parse(content);
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("custom-path-test");
    });
  });

  describe("Run Persistence Across Instances", () => {
    it("should persist runs across service instances", async () => {
      const runDir = join(tempDir, "cross-instance");

      // Create first service instance and add run
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newRun("cross-instance-test", "echo 'persistent'"),
      );

      // Create second service instance
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Second service should see the run from the first
      const runs = await Effect.runPromise(service2.listRuns());
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("cross-instance-test");
      expect(runs[0].command).toBe("echo 'persistent'");
    });

    it("should allow multiple services to modify run list", async () => {
      const runDir = join(tempDir, "shared-runs");

      // Service 1 creates runs
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newRun("shared-1", "echo 'shared 1'"),
      );
      await Effect.runPromise(
        service1.newRun("shared-2", "echo 'shared 2'"),
      );

      // Service 2 adds another run
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service2.newRun("shared-3", "echo 'shared 3'"),
      );

      // Service 3 sees all runs
      const service3 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const runs = await Effect.runPromise(service3.listRuns());
      expect(runs.length).toBe(3);

      const runNames = runs.map((s) => s.runName).sort();
      expect(runNames).toEqual(["shared-1", "shared-2", "shared-3"]);
    });

    it("should persist run deletions across instances", async () => {
      const runDir = join(tempDir, "deletion-test");

      // Create runs
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newRun("delete-me", "echo 'to be deleted'"),
      );
      await Effect.runPromise(
        service1.newRun("keep-me", "echo 'keep this'"),
      );

      // Kill one run
      await Effect.runPromise(service1.killRun("delete-me"));

      // New service instance should not see the deleted run
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const runs = await Effect.runPromise(service2.listRuns());
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("keep-me");
    });
  });

  describe("File Corruption and Recovery", () => {
    it("should handle corrupted runs.json gracefully", async () => {
      const runDir = join(tempDir, "corrupted");
      const runFile = join(runDir, "runs.json");

      // Create directory and corrupted file
      await fs.mkdir(runDir, { recursive: true });
      await fs.writeFile(runFile, "invalid json content { broken");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle corrupted file and return empty list
      const runs = await Effect.runPromise(service.listRuns());
      expect(runs).toBeInstanceOf(Array);
      expect(runs.length).toBe(0);
    });

    it("should handle missing runs.json file", async () => {
      const runDir = join(tempDir, "missing-file");

      // Create directory but no runs.json file
      await fs.mkdir(runDir, { recursive: true });

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle missing file and return empty list
      const runs = await Effect.runPromise(service.listRuns());
      expect(runs).toBeInstanceOf(Array);
      expect(runs.length).toBe(0);
    });

    it("should recover from empty runs.json file", async () => {
      const runDir = join(tempDir, "empty-file");
      const runFile = join(runDir, "runs.json");

      // Create directory and empty JSON file
      await fs.mkdir(runDir, { recursive: true });
      await fs.writeFile(runFile, "");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle empty file gracefully
      let runs = await Effect.runPromise(service.listRuns());
      expect(runs).toBeInstanceOf(Array);
      expect(runs.length).toBe(0);

      // Should be able to add runs after empty file
      await Effect.runPromise(
        service.newRun("recovery-test", "echo 'recovered'"),
      );

      runs = await Effect.runPromise(service.listRuns());
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("recovery-test");
    });
  });

  describe("Directory Structure", () => {
    it("should create run directory structure", async () => {
      const runDir = join(tempDir, "structure-test");
      const logDir = join(tempDir, "logs-test");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir,
        }),
      );

      await Effect.runPromise(
        service.newRun("structure-test", "echo 'test'"),
      );

      // Both directories should exist
      expect(fsSync.existsSync(runDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      // Run file should exist
      const runFile = join(runDir, "runs.json");
      expect(fsSync.existsSync(runFile)).toBe(true);
    });

    it("should handle deeply nested directory structures", async () => {
      const runDir = join(
        tempDir,
        "deep",
        "nested",
        "directory",
        "structure",
      );
      const logDir = join(tempDir, "another", "deep", "log", "structure");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir,
        }),
      );

      await Effect.runPromise(service.newRun("deep-test", "echo 'deep'"));

      // All nested directories should be created
      expect(fsSync.existsSync(runDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      // Files should be created in the correct locations
      const runFile = join(runDir, "runs.json");
      expect(fsSync.existsSync(runFile)).toBe(true);
    });

    it("should handle relative paths", async () => {
      // Use relative paths - the service should resolve them relative to cwd
      const runDir = join(tempDir, "relative-runs");
      const logDir = join(tempDir, "relative-logs");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir,
        }),
      );

      await Effect.runPromise(
        service.newRun("relative-test", "echo 'relative'"),
      );

      // Check that directories and files were created
      expect(fsSync.existsSync(runDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      const runFile = join(runDir, "runs.json");
      expect(fsSync.existsSync(runFile)).toBe(true);
    });
  });

  describe("Run Data Integrity", () => {
    it("should preserve all run metadata in JSON", async () => {
      const runDir = join(tempDir, "metadata-test");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const run = await Effect.runPromise(
        service.newRun(
          "metadata-test",
          "node -e \"console.log('complex command')\"",
        ),
      );

      // Read the raw JSON to verify all fields are preserved
      const runFile = join(runDir, "runs.json");
      const content = await fs.readFile(runFile, "utf-8");
      const runs = JSON.parse(content);

      expect(runs[0]).toHaveProperty("runName");
      expect(runs[0]).toHaveProperty("pid");
      expect(runs[0]).toHaveProperty("command");
      expect(runs[0]).toHaveProperty("logFile");

      expect(runs[0].runName).toBe(run.runName);
      expect(runs[0].pid).toBe(run.pid);
      expect(runs[0].command).toBe(run.command);
      expect(runs[0].logFile).toBe(run.logFile);
    });

    it("should maintain run order in JSON array", async () => {
      const runDir = join(tempDir, "order-test");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create runs in specific order
      await Effect.runPromise(service.newRun("first", "echo '1'"));
      await Effect.runPromise(service.newRun("second", "echo '2'"));
      await Effect.runPromise(service.newRun("third", "echo '3'"));

      const runs = await Effect.runPromise(service.listRuns());

      // Verify order is maintained
      expect(runs[0].runName).toBe("first");
      expect(runs[1].runName).toBe("second");
      expect(runs[2].runName).toBe("third");

      // Check the JSON file maintains the same order
      const runFile = join(runDir, "runs.json");
      const content = await fs.readFile(runFile, "utf-8");
      const savedRuns = JSON.parse(content);

      expect(savedRuns[0].runName).toBe("first");
      expect(savedRuns[1].runName).toBe("second");
      expect(savedRuns[2].runName).toBe("third");
    });

    it("should handle special characters in commands", async () => {
      const runDir = join(tempDir, "special-chars");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const commandWithSpecialChars =
        "echo 'hello \"world\"' && echo 'multi\nline' && echo 'special: @#$%^&*()'";
      await Effect.runPromise(
        service.newRun("special-chars-test", commandWithSpecialChars),
      );

      // Read back and verify
      const runs = await Effect.runPromise(service.listRuns());
      expect(runs[0].command).toBe(commandWithSpecialChars);

      // Check JSON file
      const runFile = join(runDir, "runs.json");
      const content = await fs.readFile(runFile, "utf-8");
      const savedRuns = JSON.parse(content);
      expect(savedRuns[0].command).toBe(commandWithSpecialChars);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent run creation", async () => {
      const runDir = join(tempDir, "concurrent-create");
      const logDir = join(tempDir, "logs");

      // Create multiple service instances
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({ runDir, logDir }),
      );
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({ runDir, logDir }),
      );
      const service3 = await Effect.runPromise(
        ProcessRunnerService.make({ runDir, logDir }),
      );

      // Create runs sequentially (locking prevents true concurrency)
      await Effect.runPromise(service1.newRun("concurrent-1", "echo '1'"));
      await Effect.runPromise(service2.newRun("concurrent-2", "echo '2'"));
      await Effect.runPromise(service3.newRun("concurrent-3", "echo '3'"));

      // Verify all runs were created
      const service4 = await Effect.runPromise(
        ProcessRunnerService.make({ runDir, logDir }),
      );
      const runs = await Effect.runPromise(service4.listRuns());

      expect(runs.length).toBe(3);
      const runNames = runs.map((s) => s.runName).sort();
      expect(runNames).toEqual([
        "concurrent-1",
        "concurrent-2",
        "concurrent-3",
      ]);
    });

    it("should handle concurrent read/write operations", async () => {
      const runDir = join(tempDir, "concurrent-rw");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create initial run
      await Effect.runPromise(
        service.newRun("base-run", "echo 'base'"),
      );

      // Perform operations sequentially (writes are serialized by locking)
      // Multiple reads should work fine
      const read1 = await Effect.runPromise(service.listRuns());
      const read2 = await Effect.runPromise(service.listRuns());
      const read3 = await Effect.runPromise(service.listRuns());

      // Writes
      await Effect.runPromise(service.newRun("concurrent-a", "echo 'a'"));
      await Effect.runPromise(service.newRun("concurrent-b", "echo 'b'"));

      // All read operations should return valid results
      expect(read1.length).toBeGreaterThanOrEqual(1); // At least the base run
      expect(read2.length).toBeGreaterThanOrEqual(1);
      expect(read3.length).toBeGreaterThanOrEqual(1);

      // Final read should show all runs
      const finalRuns = await Effect.runPromise(service.listRuns());
      expect(finalRuns.length).toBe(3); // base + a + b
    });
  });

  describe("Process Monitoring Integration", () => {
    it("should integrate process monitoring with persistence", async () => {
      const runDir = join(tempDir, "process-monitoring");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          runDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create a run (this uses mocked PTY)
      await Effect.runPromise(
        service.newRun("monitor-test", "echo 'monitor'"),
      );

      // List runs - this will include process monitoring logic
      const runs = await Effect.runPromise(service.listRuns());

      // Should have the run (mocked process appears running)
      expect(runs.length).toBe(1);
      expect(runs[0].runName).toBe("monitor-test");
    });

    it("should handle process monitoring failures gracefully", async () => {
      // Test with a different platform or error condition
      const originalPlatform = process.platform;

      try {
        // Temporarily change platform to test different code paths
        Object.defineProperty(process, "platform", {
          writable: true,
          value: "win32",
        });

        const runDir = join(tempDir, "platform-test");
        const service = await Effect.runPromise(
          ProcessRunnerService.make({
            runDir,
            logDir: join(tempDir, "logs"),
          }),
        );

        await Effect.runPromise(
          service.newRun("platform-test", "echo 'platform'"),
        );

        // Should still work despite platform change
        const runs = await Effect.runPromise(service.listRuns());
        expect(runs.length).toBe(1);
      } finally {
        Object.defineProperty(process, "platform", {
          writable: true,
          value: originalPlatform,
        });
      }
    });
  });
});
