import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("generate-version.ts", () => {
  const packageJsonPath = join(__dirname, "../../package.json");
  const outputPath = join(__dirname, "../../src/lib/version.generated.ts");

  test("should have generated version file after build", async () => {
    // Check that the version file exists (should be created by build process)
    // If it doesn't exist, generate it for the test
    if (!existsSync(outputPath)) {
      await new Promise((resolve, reject) => {
        const child = spawn("bun", ["run", "scripts/generate-version.ts"], {
          cwd: join(__dirname, "../.."),
          stdio: "inherit"
        });
        child.on("close", (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Generate script failed with code ${code}`));
          }
        });
        child.on("error", reject);
      });
    }
    expect(existsSync(outputPath)).toBe(true);
  });

  test("generated version file should have correct format", () => {
    if (existsSync(outputPath)) {
      const content = readFileSync(outputPath, "utf8");
      
      // Should contain the export statement
      expect(content).toContain("export const CLI_VERSION =");
      
      // Should contain the auto-generated comment
      expect(content).toContain("This file is auto-generated during build - do not edit manually");
      
      // Should have a valid version string
      const versionMatch = content.match(/export const CLI_VERSION = "([^"]+)"/);
      expect(versionMatch).toBeTruthy();
      expect(versionMatch![1]).toBeTruthy();
      expect(versionMatch![1]).not.toBe("0.0.0");
    }
  });

  test("generated version should match package.json version", () => {
    if (existsSync(outputPath) && existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      const expectedVersion = packageJson.version;
      
      const content = readFileSync(outputPath, "utf8");
      expect(content).toContain(`export const CLI_VERSION = "${expectedVersion}";`);
    }
  });

  test("package.json should have valid version", () => {
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      const version = packageJson.version;
      
      expect(version).toBeTruthy();
      expect(typeof version).toBe("string");
      expect(version).not.toBe("0.0.0");
      
      // Should match semantic versioning pattern
      const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
      expect(version).toMatch(versionPattern);
    }
  });
});