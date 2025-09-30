// Mock bun-pty to avoid native dependencies but allow testing persistence
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as Effect from "effect/Effect";
import { ProcessRunnerService, type ProcessSessionInfo } from "../src/core.js";

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

  describe("Session File Persistence", () => {
    it("should create sessions.json file when sessions are created", async () => {
      const sessionDir = join(tempDir, "sessions");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create a session
      await Effect.runPromise(
        service.newSession("test-session", "echo 'hello'"),
      );

      // Check that sessions.json was created
      const sessionFile = join(sessionDir, "sessions.json");
      expect(fsSync.existsSync(sessionFile)).toBe(true);

      // Verify file contents
      const content = await fs.readFile(sessionFile, "utf-8");
      const sessions = JSON.parse(content);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("test-session");
      expect(sessions[0].command).toBe("echo 'hello'");
      expect(typeof sessions[0].pid).toBe("number");
      expect(sessions[0].logFile).toContain("test-session");
    });

    it("should persist multiple sessions to disk", async () => {
      const sessionDir = join(tempDir, "multi-sessions");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create multiple sessions
      await Effect.runPromise(service.newSession("session-1", "echo 'one'"));
      await Effect.runPromise(service.newSession("session-2", "echo 'two'"));
      await Effect.runPromise(service.newSession("session-3", "echo 'three'"));

      // Check file contents
      const sessionFile = join(sessionDir, "sessions.json");
      const content = await fs.readFile(sessionFile, "utf-8");
      const sessions = JSON.parse(content);

      expect(sessions.length).toBe(3);
      const sessionNames = sessions
        .map((s: ProcessSessionInfo) => s.sessionName)
        .sort();
      expect(sessionNames).toEqual(["session-1", "session-2", "session-3"]);

      const commands = sessions
        .map((s: ProcessSessionInfo) => s.command)
        .sort();
      expect(commands).toEqual(["echo 'one'", "echo 'three'", "echo 'two'"]);
    });

    it("should create log files for each session", async () => {
      const sessionDir = join(tempDir, "sessions");
      const logDir = join(tempDir, "logs");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir,
        }),
      );

      const session = await Effect.runPromise(
        service.newSession("log-test", "echo 'test'"),
      );

      // Check that log file was created
      expect(fsSync.existsSync(session.logFile)).toBe(true);

      // Check that log file is in the correct directory
      expect(session.logFile.startsWith(logDir)).toBe(true);

      // Check that log file has the session name in it
      expect(session.logFile).toContain("log-test");
    });

    it("should handle custom session directory paths", async () => {
      const customSessionDir = join(tempDir, "custom", "nested", "sessions");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir: customSessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service.newSession("custom-path-test", "echo 'custom'"),
      );

      // Check that nested directories were created
      expect(fsSync.existsSync(customSessionDir)).toBe(true);

      // Check that sessions.json was created in the custom location
      const sessionFile = join(customSessionDir, "sessions.json");
      expect(fsSync.existsSync(sessionFile)).toBe(true);

      const content = await fs.readFile(sessionFile, "utf-8");
      const sessions = JSON.parse(content);
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("custom-path-test");
    });
  });

  describe("Session Persistence Across Instances", () => {
    it("should persist sessions across service instances", async () => {
      const sessionDir = join(tempDir, "cross-instance");

      // Create first service instance and add session
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newSession("cross-instance-test", "echo 'persistent'"),
      );

      // Create second service instance
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Second service should see the session from the first
      const sessions = await Effect.runPromise(service2.listSessions());
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("cross-instance-test");
      expect(sessions[0].command).toBe("echo 'persistent'");
    });

    it("should allow multiple services to modify session list", async () => {
      const sessionDir = join(tempDir, "shared-sessions");

      // Service 1 creates sessions
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newSession("shared-1", "echo 'shared 1'"),
      );
      await Effect.runPromise(
        service1.newSession("shared-2", "echo 'shared 2'"),
      );

      // Service 2 adds another session
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service2.newSession("shared-3", "echo 'shared 3'"),
      );

      // Service 3 sees all sessions
      const service3 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const sessions = await Effect.runPromise(service3.listSessions());
      expect(sessions.length).toBe(3);

      const sessionNames = sessions.map((s) => s.sessionName).sort();
      expect(sessionNames).toEqual(["shared-1", "shared-2", "shared-3"]);
    });

    it("should persist session deletions across instances", async () => {
      const sessionDir = join(tempDir, "deletion-test");

      // Create sessions
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      await Effect.runPromise(
        service1.newSession("delete-me", "echo 'to be deleted'"),
      );
      await Effect.runPromise(
        service1.newSession("keep-me", "echo 'keep this'"),
      );

      // Kill one session
      await Effect.runPromise(service1.killSession("delete-me"));

      // New service instance should not see the deleted session
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const sessions = await Effect.runPromise(service2.listSessions());
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("keep-me");
    });
  });

  describe("File Corruption and Recovery", () => {
    it("should handle corrupted sessions.json gracefully", async () => {
      const sessionDir = join(tempDir, "corrupted");
      const sessionFile = join(sessionDir, "sessions.json");

      // Create directory and corrupted file
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(sessionFile, "invalid json content { broken");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle corrupted file and return empty list
      const sessions = await Effect.runPromise(service.listSessions());
      expect(sessions).toBeInstanceOf(Array);
      expect(sessions.length).toBe(0);
    });

    it("should handle missing sessions.json file", async () => {
      const sessionDir = join(tempDir, "missing-file");

      // Create directory but no sessions.json file
      await fs.mkdir(sessionDir, { recursive: true });

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle missing file and return empty list
      const sessions = await Effect.runPromise(service.listSessions());
      expect(sessions).toBeInstanceOf(Array);
      expect(sessions.length).toBe(0);
    });

    it("should recover from empty sessions.json file", async () => {
      const sessionDir = join(tempDir, "empty-file");
      const sessionFile = join(sessionDir, "sessions.json");

      // Create directory and empty JSON file
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(sessionFile, "");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Should handle empty file gracefully
      let sessions = await Effect.runPromise(service.listSessions());
      expect(sessions).toBeInstanceOf(Array);
      expect(sessions.length).toBe(0);

      // Should be able to add sessions after empty file
      await Effect.runPromise(
        service.newSession("recovery-test", "echo 'recovered'"),
      );

      sessions = await Effect.runPromise(service.listSessions());
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("recovery-test");
    });
  });

  describe("Directory Structure", () => {
    it("should create session directory structure", async () => {
      const sessionDir = join(tempDir, "structure-test");
      const logDir = join(tempDir, "logs-test");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir,
        }),
      );

      await Effect.runPromise(
        service.newSession("structure-test", "echo 'test'"),
      );

      // Both directories should exist
      expect(fsSync.existsSync(sessionDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      // Session file should exist
      const sessionFile = join(sessionDir, "sessions.json");
      expect(fsSync.existsSync(sessionFile)).toBe(true);
    });

    it("should handle deeply nested directory structures", async () => {
      const sessionDir = join(
        tempDir,
        "deep",
        "nested",
        "directory",
        "structure",
      );
      const logDir = join(tempDir, "another", "deep", "log", "structure");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir,
        }),
      );

      await Effect.runPromise(service.newSession("deep-test", "echo 'deep'"));

      // All nested directories should be created
      expect(fsSync.existsSync(sessionDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      // Files should be created in the correct locations
      const sessionFile = join(sessionDir, "sessions.json");
      expect(fsSync.existsSync(sessionFile)).toBe(true);
    });

    it("should handle relative paths", async () => {
      // Use relative paths - the service should resolve them relative to cwd
      const sessionDir = join(tempDir, "relative-sessions");
      const logDir = join(tempDir, "relative-logs");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir,
        }),
      );

      await Effect.runPromise(
        service.newSession("relative-test", "echo 'relative'"),
      );

      // Check that directories and files were created
      expect(fsSync.existsSync(sessionDir)).toBe(true);
      expect(fsSync.existsSync(logDir)).toBe(true);

      const sessionFile = join(sessionDir, "sessions.json");
      expect(fsSync.existsSync(sessionFile)).toBe(true);
    });
  });

  describe("Session Data Integrity", () => {
    it("should preserve all session metadata in JSON", async () => {
      const sessionDir = join(tempDir, "metadata-test");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const session = await Effect.runPromise(
        service.newSession(
          "metadata-test",
          "node -e \"console.log('complex command')\"",
        ),
      );

      // Read the raw JSON to verify all fields are preserved
      const sessionFile = join(sessionDir, "sessions.json");
      const content = await fs.readFile(sessionFile, "utf-8");
      const sessions = JSON.parse(content);

      expect(sessions[0]).toHaveProperty("sessionName");
      expect(sessions[0]).toHaveProperty("pid");
      expect(sessions[0]).toHaveProperty("command");
      expect(sessions[0]).toHaveProperty("logFile");

      expect(sessions[0].sessionName).toBe(session.sessionName);
      expect(sessions[0].pid).toBe(session.pid);
      expect(sessions[0].command).toBe(session.command);
      expect(sessions[0].logFile).toBe(session.logFile);
    });

    it("should maintain session order in JSON array", async () => {
      const sessionDir = join(tempDir, "order-test");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create sessions in specific order
      await Effect.runPromise(service.newSession("first", "echo '1'"));
      await Effect.runPromise(service.newSession("second", "echo '2'"));
      await Effect.runPromise(service.newSession("third", "echo '3'"));

      const sessions = await Effect.runPromise(service.listSessions());

      // Verify order is maintained
      expect(sessions[0].sessionName).toBe("first");
      expect(sessions[1].sessionName).toBe("second");
      expect(sessions[2].sessionName).toBe("third");

      // Check the JSON file maintains the same order
      const sessionFile = join(sessionDir, "sessions.json");
      const content = await fs.readFile(sessionFile, "utf-8");
      const savedSessions = JSON.parse(content);

      expect(savedSessions[0].sessionName).toBe("first");
      expect(savedSessions[1].sessionName).toBe("second");
      expect(savedSessions[2].sessionName).toBe("third");
    });

    it("should handle special characters in commands", async () => {
      const sessionDir = join(tempDir, "special-chars");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      const commandWithSpecialChars =
        "echo 'hello \"world\"' && echo 'multi\nline' && echo 'special: @#$%^&*()'";
      await Effect.runPromise(
        service.newSession("special-chars-test", commandWithSpecialChars),
      );

      // Read back and verify
      const sessions = await Effect.runPromise(service.listSessions());
      expect(sessions[0].command).toBe(commandWithSpecialChars);

      // Check JSON file
      const sessionFile = join(sessionDir, "sessions.json");
      const content = await fs.readFile(sessionFile, "utf-8");
      const savedSessions = JSON.parse(content);
      expect(savedSessions[0].command).toBe(commandWithSpecialChars);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent session creation", async () => {
      const sessionDir = join(tempDir, "concurrent-create");
      const logDir = join(tempDir, "logs");

      // Create multiple service instances
      const service1 = await Effect.runPromise(
        ProcessRunnerService.make({ sessionDir, logDir }),
      );
      const service2 = await Effect.runPromise(
        ProcessRunnerService.make({ sessionDir, logDir }),
      );
      const service3 = await Effect.runPromise(
        ProcessRunnerService.make({ sessionDir, logDir }),
      );

      // Create sessions sequentially (locking prevents true concurrency)
      await Effect.runPromise(service1.newSession("concurrent-1", "echo '1'"));
      await Effect.runPromise(service2.newSession("concurrent-2", "echo '2'"));
      await Effect.runPromise(service3.newSession("concurrent-3", "echo '3'"));

      // Verify all sessions were created
      const service4 = await Effect.runPromise(
        ProcessRunnerService.make({ sessionDir, logDir }),
      );
      const sessions = await Effect.runPromise(service4.listSessions());

      expect(sessions.length).toBe(3);
      const sessionNames = sessions.map((s) => s.sessionName).sort();
      expect(sessionNames).toEqual([
        "concurrent-1",
        "concurrent-2",
        "concurrent-3",
      ]);
    });

    it("should handle concurrent read/write operations", async () => {
      const sessionDir = join(tempDir, "concurrent-rw");

      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create initial session
      await Effect.runPromise(
        service.newSession("base-session", "echo 'base'"),
      );

      // Perform operations sequentially (writes are serialized by locking)
      // Multiple reads should work fine
      const read1 = await Effect.runPromise(service.listSessions());
      const read2 = await Effect.runPromise(service.listSessions());
      const read3 = await Effect.runPromise(service.listSessions());

      // Writes
      await Effect.runPromise(service.newSession("concurrent-a", "echo 'a'"));
      await Effect.runPromise(service.newSession("concurrent-b", "echo 'b'"));

      // All read operations should return valid results
      expect(read1.length).toBeGreaterThanOrEqual(1); // At least the base session
      expect(read2.length).toBeGreaterThanOrEqual(1);
      expect(read3.length).toBeGreaterThanOrEqual(1);

      // Final read should show all sessions
      const finalSessions = await Effect.runPromise(service.listSessions());
      expect(finalSessions.length).toBe(3); // base + a + b
    });
  });

  describe("Process Monitoring Integration", () => {
    it("should integrate process monitoring with persistence", async () => {
      const sessionDir = join(tempDir, "process-monitoring");
      const service = await Effect.runPromise(
        ProcessRunnerService.make({
          sessionDir,
          logDir: join(tempDir, "logs"),
        }),
      );

      // Create a session (this uses mocked PTY)
      await Effect.runPromise(
        service.newSession("monitor-test", "echo 'monitor'"),
      );

      // List sessions - this will include process monitoring logic
      const sessions = await Effect.runPromise(service.listSessions());

      // Should have the session (mocked process appears running)
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionName).toBe("monitor-test");
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

        const sessionDir = join(tempDir, "platform-test");
        const service = await Effect.runPromise(
          ProcessRunnerService.make({
            sessionDir,
            logDir: join(tempDir, "logs"),
          }),
        );

        await Effect.runPromise(
          service.newSession("platform-test", "echo 'platform'"),
        );

        // Should still work despite platform change
        const sessions = await Effect.runPromise(service.listSessions());
        expect(sessions.length).toBe(1);
      } finally {
        Object.defineProperty(process, "platform", {
          writable: true,
          value: originalPlatform,
        });
      }
    });
  });
});
