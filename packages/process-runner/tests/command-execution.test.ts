import { beforeEach, describe, expect, it } from "bun:test";
import * as Effect from "effect/Effect";
import { ProcessRunnerService } from "../src/core.js";

describe("Command Execution Strategies", () => {
  let service: ProcessRunnerService;

  beforeEach(async () => {
    const serviceEffect = ProcessRunnerService.make({
      sessionDir: "/tmp/test-process-runner-sessions",
      logDir: "/tmp/test-process-runner-logs",
    });
    service = await Effect.runPromise(serviceEffect);
  });

  describe("Direct Command Execution", () => {
    it("should execute sleep command directly", async () => {
      const sessionEffect = service.newSession("test-sleep", "sleep 2");
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-sleep");
      expect(sessionInfo.command).toBe("sleep 2");
      expect(sessionInfo.pid).toBeGreaterThan(0);
      expect(sessionInfo.logFile).toContain("test-sleep");

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify process is running
      try {
        process.kill(sessionInfo.pid, 0);
        // Process exists, which is good
      } catch (_error) {
        throw new Error(`Process ${sessionInfo.pid} should be running`);
      }

      // Clean up
      await Effect.runPromise(service.killSession("test-sleep"));
    });

    it("should execute ping command directly", async () => {
      const sessionEffect = service.newSession(
        "test-ping",
        "ping -c 3 127.0.0.1",
      );
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-ping");
      expect(sessionInfo.command).toBe("ping -c 3 127.0.0.1");
      expect(sessionInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killSession("test-ping"));
    });
  });

  describe("Shell Command Execution", () => {
    it("should use shell for complex commands", async () => {
      const sessionEffect = service.newSession(
        "test-complex",
        "echo 'start' && sleep 1 && echo 'end'",
      );
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-complex");
      expect(sessionInfo.command).toBe("echo 'start' && sleep 1 && echo 'end'");
      expect(sessionInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killSession("test-complex"));
    });

    it("should use shell for commands with pipes", async () => {
      const sessionEffect = service.newSession(
        "test-pipe",
        "echo 'hello' | grep hello",
      );
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-pipe");
      expect(sessionInfo.command).toBe("echo 'hello' | grep hello");
      expect(sessionInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killSession("test-pipe"));
    });
  });

  describe("Edge Cases", () => {
    it("should handle commands with quotes", async () => {
      const sessionEffect = service.newSession(
        "test-quotes",
        "echo 'hello world'",
      );
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-quotes");
      expect(sessionInfo.command).toBe("echo 'hello world'");
      expect(sessionInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killSession("test-quotes"));
    });

    it("should handle long-running processes", async () => {
      const sessionEffect = service.newSession("test-long", "sleep 10");
      const sessionInfo = await Effect.runPromise(sessionEffect);

      expect(sessionInfo.sessionName).toBe("test-long");
      expect(sessionInfo.command).toBe("sleep 10");
      expect(sessionInfo.pid).toBeGreaterThan(0);

      // Verify it stays alive for a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        process.kill(sessionInfo.pid, 0);
        // Should still be running
      } catch (_error) {
        throw new Error(`Long-running process should still be alive`);
      }

      // Clean up
      await Effect.runPromise(service.killSession("test-long"));
    });
  });
});
