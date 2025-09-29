import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, "../src/index.ts");

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
  it("prints help text by default", async () => {
    const result = await runCli();
    const stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("$ open-composer");
    expect(stdout).toContain("Manage AI agents");
  });

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
