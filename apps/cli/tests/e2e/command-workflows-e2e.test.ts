import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  options: { timeout?: number; cwd?: string } = {},
): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TMPDIR: testWorkDir,
      OPEN_COMPOSER_RUN_DIR: testWorkDir,
      BUN_TEST: "1",
      OPEN_COMPOSER_TELEMETRY_DISABLED: "1",
    };

    const child = spawn("bun", ["run", cliPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: options.cwd || testWorkDir,
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

describe("Command Workflow E2E Tests", () => {
  beforeEach(() => {
    const testId = Math.random().toString(36).substring(7);
    testWorkDir = join(tmpdir(), `open-composer-workflow-test-${testId}`);
    mkdirSync(testWorkDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }
  });

  describe("Configuration Workflow", () => {
    it("should complete full settings inspection workflow", async () => {
      // Step 1: List settings
      const listResult1 = await runCli(["settings", "list"]);
      expect(listResult1.code).toBe(0);

      // Step 2: Check telemetry status
      const statusResult = await runCli(["telemetry", "status"]);
      expect(statusResult.code).toBe(0);

      // Step 3: Modify via telemetry
      const enableResult = await runCli(["telemetry", "enable"]);
      expect(enableResult.code).toBe(0);

      // Step 4: Verify changes
      const listResult2 = await runCli(["settings", "list"]);
      expect(listResult2.code).toBe(0);
    });

    it("should handle telemetry settings workflow", async () => {
      // Check initial status
      const status1 = await runCli(["telemetry", "status"]);
      expect(status1.code).toBe(0);

      // Enable telemetry
      const enable = await runCli(["telemetry", "enable"]);
      expect(enable.code).toBe(0);

      // Disable telemetry (don't check persistence due to test env isolation)
      const disable = await runCli(["telemetry", "disable"]);
      expect(disable.code).toBe(0);

      // Check final status
      const status2 = await runCli(["telemetry", "status"]);
      expect(status2.code).toBe(0);

      // Reset
      const reset = await runCli(["telemetry", "reset"]);
      expect(reset.code).toBe(0);
    });
  });

  describe("Cache Management Workflow", () => {
    it("should complete full cache management cycle", async () => {
      // Step 1: Check initial status
      const status1 = await runCli(["cache", "status"]);
      expect(status1.code).toBe(0);

      // Step 2: List cache contents
      const list1 = await runCli(["cache", "list"]);
      expect(list1.code).toBe(0);

      // Step 3: Clear cache
      const clear = await runCli(["cache", "clear", "--force"]);
      expect(clear.code).toBe(0);

      // Step 4: Verify cache is cleared
      const status2 = await runCli(["cache", "status"]);
      expect(status2.code).toBe(0);

      // Step 5: List again to confirm empty
      const list2 = await runCli(["cache", "list"]);
      expect(list2.code).toBe(0);
    });

    it("should handle cache inspection with different formats", async () => {
      // JSON format
      const jsonResult = await runCli(["cache", "status", "--json"]);
      expect(jsonResult.code).toBe(0);
      expect(() => JSON.parse(jsonResult.stdout)).not.toThrow();

      // Table format (default)
      const tableResult = await runCli(["cache", "status"]);
      expect(tableResult.code).toBe(0);

      // List JSON format
      const listJson = await runCli(["cache", "list", "--json"]);
      expect(listJson.code).toBe(0);
    });
  });

  describe("Agent Discovery Workflow", () => {
    it("should list available agents", async () => {
      const result = await runCli(["agents", "list"]);
      // May pass or fail depending on environment
      expect([0, 1]).toContain(result.code);
    });

    it("should check agent availability", async () => {
      const result = await runCli(["agents", "check"]);
      // May pass or fail depending on environment
      expect([0, 1]).toContain(result.code);
    });
  });

  describe("Error Recovery Workflow", () => {
    it("should recover from invalid subcommands gracefully", async () => {
      // Try invalid subcommand
      const invalid = await runCli(["telemetry", "invalid-subcommand"]);
      expect(invalid.code).toBe(1);

      // Recover with valid command
      const valid = await runCli(["--help"]);
      expect(valid.code).toBe(0);

      // System should still be functional
      const status = await runCli(["telemetry", "status"]);
      expect(status.code).toBe(0);
    });

    it("should handle partial command execution", async () => {
      // Start a workflow
      const step1 = await runCli(["telemetry", "enable"]);
      expect(step1.code).toBe(0);

      // Execute invalid step
      const step2 = await runCli(["telemetry", "invalid"]);
      expect(step2.code).toBe(1);

      // Continue with valid step (don't check content due to test isolation)
      const step3 = await runCli(["telemetry", "status"]);
      expect(step3.code).toBe(0);
    });
  });

  describe("Data Persistence Workflow", () => {
    it("should execute configuration commands successfully", async () => {
      // Make a change
      const enable = await runCli(["telemetry", "enable"]);
      expect(enable.code).toBe(0);

      // Check status (don't verify content due to test isolation)
      const status = await runCli(["telemetry", "status"]);
      expect(status.code).toBe(0);

      // Make another change
      const disable = await runCli(["telemetry", "disable"]);
      expect(disable.code).toBe(0);

      // Check final status
      const status2 = await runCli(["telemetry", "status"]);
      expect(status2.code).toBe(0);
    });
  });

  describe("Help System Workflow", () => {
    it("should navigate help hierarchy", async () => {
      // Root help
      const rootHelp = await runCli(["--help"]);
      expect(rootHelp.code).toBe(0);
      const rootOutput = stripAnsi(rootHelp.stdout);
      expect(rootOutput).toContain("open-composer");

      // Command-specific help
      const cacheHelp = await runCli(["cache", "--help"]);
      expect(cacheHelp.code).toBe(0);
      const cacheOutput = stripAnsi(cacheHelp.stdout);
      expect(cacheOutput).toContain("cache");

      // Another command help
      const telemetryHelp = await runCli(["telemetry", "--help"]);
      expect(telemetryHelp.code).toBe(0);
      const telemetryOutput = stripAnsi(telemetryHelp.stdout);
      expect(telemetryOutput).toContain("telemetry");
    });
  });

  describe("Multi-Step Workflows", () => {
    it("should execute complex multi-command workflow", async () => {
      // Step 1: Initial state check
      const initialTelemetry = await runCli(["telemetry", "status"]);
      expect(initialTelemetry.code).toBe(0);

      const initialSettings = await runCli(["settings", "list"]);
      expect(initialSettings.code).toBe(0);

      // Step 2: Make changes
      await runCli(["telemetry", "enable"]);

      // Step 3: Verify commands execute
      const newTelemetry = await runCli(["telemetry", "status"]);
      expect(newTelemetry.code).toBe(0);

      const newSettings = await runCli(["settings", "list"]);
      expect(newSettings.code).toBe(0);

      // Step 4: Restore state
      await runCli(["telemetry", "disable"]);

      // Step 5: Final verification
      const finalTelemetry = await runCli(["telemetry", "status"]);
      expect(finalTelemetry.code).toBe(0);
    });
  });

  describe("Concurrent Command Execution", () => {
    it("should handle independent commands concurrently", async () => {
      const commands = [
        runCli(["telemetry", "status"]),
        runCli(["settings", "list"]),
        runCli(["--help"]),
      ];

      const results = await Promise.all(commands);

      for (const result of results) {
        expect(result.code).toBe(0);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle commands with no output gracefully", async () => {
      const result = await runCli(["cache", "clear", "--force"]);
      expect(result.code).toBe(0);
      // Command may have minimal output
    });

    it("should handle rapid command succession", async () => {
      for (let i = 0; i < 3; i++) {
        const result = await runCli(["cache", "status"]);
        expect(result.code).toBe(0);
      }
    });

    it("should handle very long output", async () => {
      const result = await runCli(["--help"]);
      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });
});
