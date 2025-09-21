import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("CLI Execution", () => {
  it("CLI runs without crashing", async () => {
    const cliPath = join(__dirname, "../index.ts");

    return new Promise<void>((resolve, reject) => {
      const child = spawn("bun", ["run", cliPath], {
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

      child.on("close", (code) => {
        expect(code).toBe(0);
        expect(stderr).toBe("");
        resolve();
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  });
});
