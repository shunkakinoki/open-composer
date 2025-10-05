import { describe, expect, test, beforeAll } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("generate-version.ts", () => {
  const packageJsonPath = join(__dirname, "../../package.json");
  const outputPath = join(__dirname, "../../src/lib/version.generated.ts");

  beforeAll(() => {
    // Generate the version file before running tests
    const scriptPath = join(__dirname, "../../scripts/generate-version.ts");
    const result = spawnSync("bun", [scriptPath], {
      cwd: join(__dirname, "../.."),
      encoding: "utf8",
    });

    if (result.status !== 0) {
      console.error("Failed to generate version file:", result.stderr || result.error);
      throw new Error(`Failed to generate version file: ${result.stderr || result.error}`);
    }
  });

  test("should have generated version file after build", () => {
    expect(existsSync(outputPath)).toBe(true);
  });

  test("generated version file should have correct format", () => {
    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, "utf8");

    // Should contain the export statement
    expect(content).toContain("export const CLI_VERSION =");

    // Should contain the auto-generated comment
    expect(content).toContain("This file is auto-generated during build - do not edit manually");

    // Should have a valid version string
    const versionMatch = content.match(/export const CLI_VERSION = "([^"]+)"/);
    expect(versionMatch).toBeTruthy();
    expect(versionMatch![1]).toBeTruthy();

    // Version must NOT be 0.0.0 - it should be the actual package.json version
    const version = versionMatch![1];
    expect(version).not.toBe("0.0.0");

    const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    expect(version).toMatch(versionPattern);
  });

  test("generated version should match package.json version", () => {
    expect(existsSync(outputPath)).toBe(true);
    expect(existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const expectedVersion = packageJson.version;

    const content = readFileSync(outputPath, "utf8");
    const versionMatch = content.match(/export const CLI_VERSION = "([^"]+)"/);
    expect(versionMatch).toBeTruthy();

    const actualVersion = versionMatch![1];
    // Version MUST match package.json exactly - no cheating with placeholders!
    expect(actualVersion).toBe(expectedVersion);
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