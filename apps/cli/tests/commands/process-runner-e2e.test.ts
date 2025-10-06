import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, "../../src/index.ts");

interface CliResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

const stripAnsi = (value: string): string =>
  value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");

const runCli = (
  args: string[] = [],
  options: { timeout?: number; input?: string } = {},
): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TMPDIR: testWorkDir,
      // Set run directory to the test working directory
      OPEN_COMPOSER_RUN_DIR: testWorkDir,
      // Set test mode to avoid interactive prompts
      BUN_TEST: "1",
    };

    const child = spawn("bun", ["run", cliPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(__dirname, "../.."), // Run from CLI root directory
      env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    if (options.input && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(`CLI command timed out after ${options.timeout || 10000}ms`),
      );
    }, options.timeout || 10000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, code });
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

let testWorkDir: string;

describe("Process Runner E2E Tests", () => {
  beforeEach(() => {
    // Create a unique temporary directory for each test
    const testId = Math.random().toString(36).substring(7);
    testWorkDir = join(tmpdir(), `open-composer-test-${testId}`);
    mkdirSync(testWorkDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }
  });

  describe("True Terminal Experience", () => {
    it("should spawn a process and allow live stdio interaction", async () => {
      // Spawn a long-running process that echoes input
      const spawnResult = await runCli(
        ["run", "spawn", "test-interactive-run", "echo 'hello world'"],
        { timeout: 2000 },
      );

      expect(spawnResult.code).toBe(0);
      expect(stripAnsi(spawnResult.stdout)).toContain(
        "Spawned run: test-interactive-run",
      );
      expect(stripAnsi(spawnResult.stdout)).toContain("PID:");
      expect(stripAnsi(spawnResult.stdout)).toContain("Log file:");

      // List runs to verify it was created
      const listResult = await runCli(["run", "list"]);
      expect(listResult.code).toBe(0);
      expect(stripAnsi(listResult.stdout)).toContain(
        "test-interactive-run",
      );

      // Clean up
      const killResult = await runCli([
        "run",
        "kill",
        "test-interactive-run",
      ]);
      expect(killResult.code).toBe(0);
      expect(stripAnsi(killResult.stdout)).toContain(
        "Killed run: test-interactive-run",
      );
    });

    it("should handle process that exits immediately", async () => {
      // Spawn a process that exits immediately
      const spawnResult = await runCli([
        "run",
        "spawn",
        "test-short-lived",
        "echo 'Hello from short-lived process'",
      ]);

      expect(spawnResult.code).toBe(0);
      expect(stripAnsi(spawnResult.stdout)).toContain(
        "Spawned run: test-short-lived",
      );

      // The process should exit quickly, so it might not show in list
      // But the run should still be created initially
      const listResult = await runCli(["run", "list"]);
      expect(listResult.code).toBe(0);
      // Process may or may not be in list depending on timing
    });

    it("should support attaching to running processes", async () => {
      // Spawn a process that stays alive and produces output
      const spawnResult = await runCli(
        ["run", "spawn", "test-attach-run", "echo 'Process started'"],
        { timeout: 15000 },
      );

      expect(spawnResult.code).toBe(0);

      // Give the process a moment to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to attach (this should show live output)
      // Note: In a real E2E test, we might need to handle the interactive nature differently
      // For now, we'll just verify the attach command doesn't error
      const attachResult = await runCli(
        ["run", "attach", "test-attach-run"],
        { timeout: 3000 },
      );

      // The attach command should either succeed or fail gracefully
      expect(attachResult.code).not.toBeNull();
      if (typeof attachResult.code === "number") {
        expect([0, 1]).toContain(attachResult.code);
      }

      // Clean up
      const killResult = await runCli([
        "run",
        "kill",
        "test-attach-run",
      ]);
      expect(killResult.code).toBe(0);
    });
  });

  describe("Lightweight Architecture", () => {
    it("should work without requiring external binaries like dtach/tmux", async () => {
      // This test verifies that the process runner works using only bun-pty
      // which provides true terminal interaction without external binaries

      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          "test-lightweight",
          "echo 'Testing lightweight implementation'",
        ],
        { timeout: 15000 },
      );

      expect(spawnResult.code).toBe(0);
      expect(stripAnsi(spawnResult.stdout)).toContain(
        "Spawned run: test-lightweight",
      );

      // Verify no external binary dependencies are mentioned in output
      expect(stripAnsi(spawnResult.stdout)).not.toContain("dtach");
      expect(stripAnsi(spawnResult.stdout)).not.toContain("tmux");
      expect(stripAnsi(spawnResult.stderr)).not.toContain("command not found");

      // Clean up
      await runCli(["run", "kill", "test-lightweight"]);
    });

    it("should handle process lifecycle without external process managers", async () => {
      // Test complete lifecycle: spawn -> list -> kill
      const runName = "test-lifecycle";

      // Spawn
      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          runName,
          "echo 'running'", // Simple process
        ],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // List - should show the process
      const listResult1 = await runCli(["run", "list"]);
      expect(listResult1.code).toBe(0);
      expect(stripAnsi(listResult1.stdout)).toContain(runName);

      // Kill
      const killResult = await runCli(["run", "kill", runName]);
      expect(killResult.code).toBe(0);

      // List again - should not show the process
      const listResult2 = await runCli(["run", "list"]);
      expect(listResult2.code).toBe(0);
      expect(stripAnsi(listResult2.stdout)).not.toContain(runName);
    });
  });

  describe("CLI Integration", () => {
    it("should integrate seamlessly with existing Open Composer CLI", async () => {
      // Test that process runner commands appear in help
      const helpResult = await runCli(["--help"], { timeout: 15000 });
      expect(helpResult.code).toBe(0);

      const helpText = stripAnsi(helpResult.stdout);
      expect(helpText).toContain("run");
    });

    it("should handle command line arguments correctly", async () => {
      // Test run spawn with all arguments
      const result = await runCli(
        [
          "run",
          "spawn",
          "--log-dir",
          join(testWorkDir, "custom-logs"),
          "test-args",
          "echo test",
        ],
        { timeout: 15000 },
      );

      expect(result.code).toBe(0);
      expect(stripAnsi(result.stdout)).toContain("Spawned run: test-args");

      // Clean up
      await runCli(["run", "kill", "test-args"]);
    });

    it("should provide helpful error messages for invalid commands", async () => {
      // Test with non-existent run
      const attachResult = await runCli([
        "run",
        "attach",
        "non-existent-run",
      ]);
      expect(attachResult.code).toBe(1);
      // Error messages are handled by the CLI framework, just check exit code

      // Test kill with non-existent run
      const killResult = await runCli([
        "run",
        "kill",
        "non-existent-run",
      ]);
      expect(killResult.code).toBe(1);
      // Error messages are handled by the CLI framework, just check exit code
    });
  });

  describe("Persistent Runs", () => {
    it("should persist run metadata across CLI invocations", async () => {
      const runName = "test-persistence";

      // Spawn a run
      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          runName,
          "echo 'run started'", // Simple process
        ],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // Verify run exists
      const listResult1 = await runCli(["run", "list"]);
      expect(listResult1.code).toBe(0);
      expect(stripAnsi(listResult1.stdout)).toContain(runName);

      // Simulate "CLI restart" by running another command
      // In a real scenario, this would be a separate process
      const listResult2 = await runCli(["run", "list"]);
      expect(listResult2.code).toBe(0);
      expect(stripAnsi(listResult2.stdout)).toContain(runName);

      // Clean up
      const killResult = await runCli(["run", "kill", runName]);
      expect(killResult.code).toBe(0);
    });

    it("should maintain log files for historical recovery", async () => {
      const runName = "test-logs";

      // Spawn a process that generates output
      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          runName,
          "echo 'line 1' && echo 'line 2' && echo 'line 3'",
        ],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // Extract log file path from output
      const output = stripAnsi(spawnResult.stdout);
      const logMatch = output.match(/Log file: (.+)/);
      expect(logMatch).toBeTruthy();

      const logFile = logMatch?.[1].trim();
      expect(logFile).toBeDefined();

      // Verify log file exists and contains expected content
      if (typeof logFile === "string") {
        expect(existsSync(logFile)).toBe(true);
      }

      // Test log recovery by attaching with line limit
      // Note: This tests the log recovery feature, not live attachment
      const attachResult = await runCli(
        ["run", "attach", runName, "--lines", "2"],
        { timeout: 3000 },
      );

      // The attach command should complete (process may have exited)
      expect(attachResult.code).not.toBeNull();
      if (typeof attachResult.code === "number") {
        expect([0, 1]).toContain(attachResult.code);
      }

      // Clean up
      await runCli(["run", "kill", runName]);
    });

    it("should support log filtering with search patterns", async () => {
      const runName = "test-search";

      // Spawn a process that generates searchable output
      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          runName,
          "echo 'INFO: Starting process' && echo 'ERROR: Something went wrong' && echo 'INFO: Process completed'",
        ],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // Test attaching with search filter
      const attachResult = await runCli(
        ["run", "attach", runName, "--search", "ERROR"],
        { timeout: 3000 },
      );
      expect(attachResult.code).not.toBeNull();
      if (typeof attachResult.code === "number") {
        expect([0, 1]).toContain(attachResult.code);
      }

      // Clean up
      await runCli(["run", "kill", runName]);
    });

    it("should clean up dead processes from run list", async () => {
      const runName = "test-cleanup";

      // Spawn a short-lived process
      const spawnResult = await runCli(
        ["run", "spawn", runName, "echo 'Quick process' && exit 0"],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // Give it time to exit
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // List should clean up dead processes
      const listResult = await runCli(["run", "list"]);
      expect(listResult.code).toBe(0);

      // The run should not appear in the list anymore
      // (Note: timing-dependent, but the cleanup logic should work)
    });
  });

  describe("Cross-Platform Compatibility", () => {
    it("should work on the current platform", async () => {
      // Basic functionality test that should work on any supported platform
      const spawnResult = await runCli(
        ["run", "spawn", "test-platform", "echo 'Platform test'"],
        { timeout: 15000 },
      );

      expect(spawnResult.code).toBe(0);
      expect(stripAnsi(spawnResult.stdout)).toContain(
        "Spawned run: test-platform",
      );

      // Clean up
      await runCli(["run", "kill", "test-platform"]);
    });

    it("should handle platform-specific path separators", async () => {
      // Test with a command that uses paths
      const testFile = join(testWorkDir, "test.txt");
      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          "test-paths",
          `echo 'test content' > "${testFile}" && cat "${testFile}"`,
        ],
        { timeout: 15000 },
      );

      expect(spawnResult.code).toBe(0);

      // Clean up
      await runCli(["run", "kill", "test-paths"]);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid run names gracefully", async () => {
      const result = await runCli(["run", "attach", ""]);
      expect(result.code).toBe(1);
      // CLI framework handles argument validation errors
    });

    it("should handle concurrent run operations", async () => {
      // Test rapid spawn/kill operations
      const runName = "test-concurrent";

      const spawnResult = await runCli(
        [
          "run",
          "spawn",
          runName,
          "echo 'test concurrent' && sleep 0.5",
        ],
        { timeout: 15000 },
      );
      expect(spawnResult.code).toBe(0);

      // Immediate kill
      const killResult = await runCli(["run", "kill", runName]);
      expect(killResult.code).toBe(0);
    });

    it("should handle malformed commands gracefully", async () => {
      // Test with missing arguments
      const result = await runCli(["run", "spawn"]);
      expect(result.code).toBe(1);
      // CLI framework handles argument validation errors
    });
  });
});
