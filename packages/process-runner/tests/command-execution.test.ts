import { beforeEach, describe, expect, it } from "bun:test";
import * as Effect from "effect/Effect";
import { ProcessRunnerService } from "../src/core.js";

describe("Command Execution Strategies", () => {
  let service: ProcessRunnerService;

  beforeEach(async () => {
    const serviceEffect = ProcessRunnerService.make({
      runDir: "/tmp/test-process-runner-runs",
      logDir: "/tmp/test-process-runner-logs",
    });
    service = await Effect.runPromise(serviceEffect);
  });

  describe("Direct Command Execution", () => {
    it("should execute sleep command directly", async () => {
      const runEffect = service.newRun("test-sleep", "sleep 2");
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-sleep");
      expect(runInfo.command).toBe("sleep 2");
      expect(runInfo.pid).toBeGreaterThan(0);
      expect(runInfo.logFile).toContain("test-sleep");

      // Give it a moment to start and verify it's running
      await new Promise((resolve) => setTimeout(resolve, 200));

      // For PTY processes, check if the run is still active in our tracking
      // The bash process may exit but the run should remain until killed
      const runs = await Effect.runPromise(service.listRuns());
      const run = runs.find((s) => s.runName === "test-sleep");
      expect(run).toBeDefined();
      expect(run?.runName).toBe("test-sleep");

      // Clean up
      await Effect.runPromise(service.killRun("test-sleep"));
    });

    it("should execute ping command directly", async () => {
      const runEffect = service.newRun(
        "test-ping",
        "ping -c 3 127.0.0.1",
      );
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-ping");
      expect(runInfo.command).toBe("ping -c 3 127.0.0.1");
      expect(runInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killRun("test-ping"));
    });
  });

  describe("Shell Command Execution", () => {
    it("should use shell for complex commands", async () => {
      const runEffect = service.newRun(
        "test-complex",
        "echo 'start' && sleep 1 && echo 'end'",
      );
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-complex");
      expect(runInfo.command).toBe("echo 'start' && sleep 1 && echo 'end'");
      expect(runInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killRun("test-complex"));
    });

    it("should use shell for commands with pipes", async () => {
      const runEffect = service.newRun(
        "test-pipe",
        "echo 'hello' | grep hello",
      );
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-pipe");
      expect(runInfo.command).toBe("echo 'hello' | grep hello");
      expect(runInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killRun("test-pipe"));
    });
  });

  describe("Edge Cases", () => {
    it("should handle commands with quotes", async () => {
      const runEffect = service.newRun(
        "test-quotes",
        "echo 'hello world'",
      );
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-quotes");
      expect(runInfo.command).toBe("echo 'hello world'");
      expect(runInfo.pid).toBeGreaterThan(0);

      // Clean up
      await Effect.runPromise(service.killRun("test-quotes"));
    });

    it("should handle long-running processes", async () => {
      const runEffect = service.newRun("test-long", "sleep 5");
      const runInfo = await Effect.runPromise(runEffect);

      expect(runInfo.runName).toBe("test-long");
      expect(runInfo.command).toBe("sleep 5");
      expect(runInfo.pid).toBeGreaterThan(0);

      // Verify the run is tracked and active
      await new Promise((resolve) => setTimeout(resolve, 500));

      const runs = await Effect.runPromise(service.listRuns());
      const run = runs.find((s) => s.runName === "test-long");
      expect(run).toBeDefined();
      expect(run?.runName).toBe("test-long");
      expect(run?.command).toBe("sleep 5");

      // Clean up
      await Effect.runPromise(service.killRun("test-long"));
    });
  });
});
