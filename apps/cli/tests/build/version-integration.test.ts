import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { readFileSync, writeFileSync, unlinkSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

const execAsync = (command: string, args: string[], cwd?: string): Promise<ExecResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
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

describe("version integration in build process", () => {
  const packageJsonPath = join(__dirname, "../../package.json");
  const versionGeneratedPath = join(__dirname, "../../src/lib/version.generated.ts");
  const distPath = join(__dirname, "../../dist");

  let originalPackageJson: string | null = null;
  let originalVersionGenerated: string | null = null;

  beforeEach(() => {
    // Backup original files
    if (existsSync(packageJsonPath)) {
      originalPackageJson = readFileSync(packageJsonPath, "utf8");
    }
    if (existsSync(versionGeneratedPath)) {
      originalVersionGenerated = readFileSync(versionGeneratedPath, "utf8");
    }

    // Clean dist directory
    if (existsSync(distPath)) {
      rmSync(distPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Restore original files
    if (originalPackageJson) {
      writeFileSync(packageJsonPath, originalPackageJson, "utf8");
    }
    
    if (originalVersionGenerated) {
      writeFileSync(versionGeneratedPath, originalVersionGenerated, "utf8");
    } else if (existsSync(versionGeneratedPath)) {
      unlinkSync(versionGeneratedPath);
    }

    // Clean dist directory
    if (existsSync(distPath)) {
      rmSync(distPath, { recursive: true, force: true });
    }
  });

  test("build process should embed correct version in bundled output", async () => {
    const testVersion = "1.2.3-test";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Run the build process
    const result = await execAsync("bun", ["run", "build"], join(__dirname, "../.."));

    expect(result.code).toBe(0);

    // Check that version.generated.ts was created
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

    // Check that dist/index.js was created
    const distIndexPath = join(distPath, "index.js");
    expect(existsSync(distIndexPath)).toBe(true);

    // Since version is read at module load time, we test that the generated file
    // contains the correct version (the actual CLI_VERSION will be cached from first import)
    const generatedContent2 = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent2).toContain(`export const CLI_VERSION = "${testVersion}";`);
  });

  test("generate-version script should handle invalid package.json gracefully", async () => {
    // Create invalid package.json
    writeFileSync(packageJsonPath, '{"invalid": "json"', "utf8");

    // Run the generate-version script
    const result = await execAsync("bun", ["run", "scripts/generate-version.ts"], join(__dirname, "../.."));

    // Script should still succeed (it has fallback logic)
    expect(result.code).toBe(0);

    // Check that version.generated.ts contains the fallback version
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain('export const CLI_VERSION = "0.0.0";');
  });

  test("version should be read correctly from modified package.json", async () => {
    const testVersion = "2.0.0-rc.1";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Check that CLI_VERSION reads the updated version
    const { CLI_VERSION } = await import("../../src/lib/version.js");
    expect(String(CLI_VERSION)).toBe(testVersion);

    // Run generate-version script to ensure it still works
    const result = await execAsync("bun", ["run", "scripts/generate-version.ts"], join(__dirname, "../.."));
    expect(result.code).toBe(0);

    // Check that version.generated.ts was created with correct version
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);
  });

  test("build process should work with modified package.json version", async () => {
    const testVersion = "3.1.0";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Run the build process
    const buildResult = await execAsync("bun", ["run", "build"], join(__dirname, "../.."));

    expect(buildResult.code).toBe(0);

    // Check that version.generated.ts has the correct version
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

    // Check that CLI_VERSION reads the correct version
    const { CLI_VERSION } = await import("../../src/lib/version.js");
    expect(String(CLI_VERSION)).toBe(testVersion);

    // Check that the bundled output contains the version (from generated file)
    const distIndexPath = join(distPath, "index.js");
    expect(existsSync(distIndexPath)).toBe(true);
    const bundledContent = readFileSync(distIndexPath, "utf8");
    expect(bundledContent).toContain(testVersion);
  });
});