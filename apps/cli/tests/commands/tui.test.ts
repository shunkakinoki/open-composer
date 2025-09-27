import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripAnsi } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, "../../src/index.ts");

describe("TUI Command", () => {
  it("launches the interactive TUI", async () => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("bun", ["run", cliPath, "tui"], {
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

      // Give it some time to start up, then kill it
      setTimeout(() => {
        child.kill("SIGINT");
      }, 1000);

      child.on("close", (code) => {
        expect(code === 0 || code === null).toBe(true);

        const hasRealErrors =
          stderr &&
          !stderr.includes("Warning:") &&
          !stderr.includes("Encountered") &&
          !stderr.includes("experimental") &&
          !stderr.includes("Warning: ReactDOM.render is deprecated");

        expect(hasRealErrors).toBe(false);
        expect(stdout.length).toBeGreaterThan(0);
        resolve();
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  });

  it("shows help text for tui command", async () => {
    const { runCli } = await import("../utils");
    const result = await runCli(["tui", "--help"]);
    const stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Launch the interactive TUI");
  });
});
