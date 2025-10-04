import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { isatty } from "node:tty";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, "../src/index.ts");

// Check if we're in a CI environment or don't have a TTY
const isCI = process.env.CI === "true" || !isatty(1);

interface CliResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

const stripAnsi = (value: string): string =>
  value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");

const runCli = (args: string[] = []): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", cliPath, ...args], {
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    child.on("error", (error) => {
      reject(error);
    });
  });

describe("CLI Execution", () => {
  it.skipIf(isCI)("launches welcome screen TUI by default", async () => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("bun", ["run", cliPath], {
        stdio: "pipe",
        timeout: 5000,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      setTimeout(() => {
        child.kill("SIGINT");
      }, 1000);

      child.on("close", (_code) => {
        const strippedStdout = stripAnsi(stdout);
        // Check that TUI components are rendered
        expect(strippedStdout).toContain("Open Composer CLI");
        expect(strippedStdout).toContain("Welcome to Open Composer");
        const hasRealErrors =
          stderr.length > 0 &&
          !stderr.includes("Warning:") &&
          !stderr.includes("Encountered");
        expect(hasRealErrors).toBe(false);
        resolve();
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  });

  it.skipIf(isCI)(
    "launches welcome screen TUI that matches expected structure",
    async () => {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("bun", ["run", cliPath], {
          stdio: "pipe",
          timeout: 5000,
        });

        let stdout = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        setTimeout(() => {
          child.kill("SIGINT");
        }, 1000);

        child.on("close", (_code) => {
          const strippedStdout = stripAnsi(stdout);
          // Verify key TUI components are present
          expect(strippedStdout).toContain("Main Menu");
          expect(strippedStdout).toContain("Sessions");
          expect(strippedStdout).toContain("Quick Info");
          resolve();
        });

        child.on("error", (error) => {
          reject(error);
        });
      });
    },
  );

  it("launches the TUI when requested", async () => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("bun", ["run", cliPath, "tui"], {
        stdio: "pipe",
        timeout: 5000,
      });

      let _stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        _stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      setTimeout(() => {
        child.kill("SIGINT");
      }, 1000);

      child.on("close", (code) => {
        expect(code === 0 || code === null).toBe(true);
        const hasRealErrors =
          stderr.length > 0 &&
          !stderr.includes("Warning:") &&
          !stderr.includes("Encountered");
        expect(hasRealErrors).toBe(false);
        resolve();
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  });

  it("supports gw list", async () => {
    const result = await runCli(["gw", "list"]);
    const stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Git worktrees:");
  });
});
