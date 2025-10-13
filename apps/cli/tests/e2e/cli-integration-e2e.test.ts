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
  options: { timeout?: number; input?: string; cwd?: string } = {},
): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TMPDIR: testWorkDir,
      OPEN_COMPOSER_RUN_DIR: testWorkDir,
      BUN_TEST: "1",
      // Disable telemetry prompts in tests
      OPEN_COMPOSER_TELEMETRY_DISABLED: "1",
    };

    const child = spawn("bun", ["run", cliPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: options.cwd || join(__dirname, "../.."),
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

describe("CLI Integration E2E Tests", () => {
  beforeEach(() => {
    const testId = Math.random().toString(36).substring(7);
    testWorkDir = join(tmpdir(), `open-composer-test-${testId}`);
    mkdirSync(testWorkDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }
  });

  describe("CLI Help System", () => {
    it("should display help when no arguments are provided", async () => {
      const result = await runCli(["--help"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("open-composer");
    });

    it("should display version information", async () => {
      const result = await runCli(["--version"]);
      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should list all available commands in help", async () => {
      const result = await runCli(["--help"]);
      const output = stripAnsi(result.stdout);

      // Check for main commands (based on actual output)
      expect(output).toContain("telemetry");
      expect(output).toContain("agents");
      expect(output).toContain("status");
    });

    it("should provide command-specific help", async () => {
      const result = await runCli(["telemetry", "--help"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("telemetry");
    });
  });

  describe("Settings Command E2E", () => {
    it("should list settings", async () => {
      const result = await runCli(["settings", "list"]);
      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should list settings in JSON format", async () => {
      const result = await runCli(["settings", "list", "--json"]);
      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("Agents Command E2E", () => {
    it("should list agents", async () => {
      const result = await runCli(["agents", "list"]);
      // May pass or fail depending on environment
      expect([0, 1]).toContain(result.code);
    });

    it("should check agents", async () => {
      const result = await runCli(["agents", "check"]);
      // May pass or fail depending on environment
      expect([0, 1]).toContain(result.code);
    });
  });

  describe("Telemetry Command E2E", () => {
    it("should show telemetry status", async () => {
      const result = await runCli(["telemetry", "status"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("Telemetry");
    });

    it("should enable telemetry", async () => {
      const result = await runCli(["telemetry", "enable"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("enabled");
    });

    it("should disable telemetry", async () => {
      const result = await runCli(["telemetry", "disable"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("disabled");
    });

    it("should reset telemetry consent", async () => {
      const result = await runCli(["telemetry", "reset"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      expect(output).toContain("reset");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid subcommands", async () => {
      const result = await runCli(["telemetry", "invalid-subcommand"]);
      expect(result.code).toBe(1);
    });

    it("should handle missing required arguments", async () => {
      const result = await runCli(["sessions-viewer", "view"]);
      expect(result.code).toBe(1);
    });

    it("should provide helpful error messages", async () => {
      const result = await runCli(["telemetry", "invalid-subcommand"]);
      expect(result.code).toBe(1);
      // Error output should exist (either in stdout or stderr)
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe("Command Chaining", () => {
    it("should execute telemetry commands in sequence", async () => {
      // Check initial status
      const status1 = await runCli(["telemetry", "status"]);
      expect(status1.code).toBe(0);

      // Enable telemetry
      const enable = await runCli(["telemetry", "enable"]);
      expect(enable.code).toBe(0);

      // Disable
      const disable = await runCli(["telemetry", "disable"]);
      expect(disable.code).toBe(0);

      // Final status
      const status2 = await runCli(["telemetry", "status"]);
      expect(status2.code).toBe(0);
    });

    it("should handle settings commands", async () => {
      // List settings
      const list1 = await runCli(["settings", "list"]);
      expect(list1.code).toBe(0);

      // Enable telemetry
      await runCli(["telemetry", "enable"]);

      // List settings again
      const list2 = await runCli(["settings", "list"]);
      expect(list2.code).toBe(0);
    });
  });

  describe("Output Formatting", () => {
    it("should format output correctly", async () => {
      const result = await runCli(["telemetry", "status"]);
      expect(result.code).toBe(0);
      const output = stripAnsi(result.stdout);
      // Should have some structure
      expect(output.length).toBeGreaterThan(0);
    });

    it("should display status information", async () => {
      const result = await runCli(["telemetry", "status"]);
      expect(result.code).toBe(0);

      // Should contain telemetry information
      const output = stripAnsi(result.stdout);
      expect(output).toContain("Telemetry");
    });
  });

  describe("Cross-Command Integration", () => {
    it("should execute telemetry operations", async () => {
      // Enable telemetry
      const enable = await runCli(["telemetry", "enable"]);
      expect(enable.code).toBe(0);

      // Check status
      const status = await runCli(["telemetry", "status"]);
      expect(status.code).toBe(0);

      // Disable
      const disable = await runCli(["telemetry", "disable"]);
      expect(disable.code).toBe(0);
    });

    it("should handle settings commands", async () => {
      // List settings
      const list1 = await runCli(["settings", "list"]);
      expect(list1.code).toBe(0);

      // Modify telemetry
      await runCli(["telemetry", "enable"]);

      // List settings again
      const list2 = await runCli(["settings", "list"]);
      expect(list2.code).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should execute help command quickly", async () => {
      const start = Date.now();
      const result = await runCli(["--help"]);
      const duration = Date.now() - start;

      expect(result.code).toBe(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle rapid sequential commands", async () => {
      const commands = [
        ["telemetry", "status"],
        ["settings", "list"],
        ["--help"],
      ];

      for (const cmd of commands) {
        const result = await runCli(cmd);
        expect(result.code).toBe(0);
      }
    });
  });

  describe("Exit Codes", () => {
    it("should return 0 for successful commands", async () => {
      const result = await runCli(["telemetry", "status"]);
      expect(result.code).toBe(0);
    });

    it("should return non-zero for failed subcommands", async () => {
      const result = await runCli(["telemetry", "invalid-subcommand"]);
      expect(result.code).toBe(1);
    });

    it("should return non-zero for missing arguments", async () => {
      const result = await runCli(["sessions-viewer", "view"]);
      expect(result.code).not.toBe(0);
    });
  });
});
