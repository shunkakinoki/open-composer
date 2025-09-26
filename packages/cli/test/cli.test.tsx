import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("CLI Execution", () => {
  it("CLI starts without crashing", async () => {
    const cliPath = join(__dirname, "../src/index.ts");

    return new Promise<void>((resolve, reject) => {
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

      // Kill the process after 1 second to verify it started successfully
      setTimeout(() => {
        child.kill("SIGINT");
      }, 1000);

      child.on("close", (code) => {
        // Process should exit cleanly (either 0 or null due to SIGINT)
        expect(code === 0 || code === null).toBe(true);

        // Allow React warnings in stderr but no actual errors
        // React warnings contain "Warning:" or "Encountered"
        const hasRealErrors =
          stderr &&
          !stderr.includes("Warning:") &&
          !stderr.includes("Encountered");
        expect(hasRealErrors).toBe(false);

        // Should produce some stdout (the CLI interface)
        expect(stdout.length).toBeGreaterThan(0);
        resolve();
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  });
});
