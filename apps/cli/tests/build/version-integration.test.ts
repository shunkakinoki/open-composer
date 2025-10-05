import { describe, expect, test, beforeEach, beforeAll, afterAll } from "bun:test";
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

  beforeAll(() => {
    // Backup original files once for all tests
    if (existsSync(packageJsonPath)) {
      originalPackageJson = readFileSync(packageJsonPath, "utf8");
    }
    if (existsSync(versionGeneratedPath)) {
      originalVersionGenerated = readFileSync(versionGeneratedPath, "utf8");
    }
  });

  afterAll(() => {
    // Restore original files once after all tests
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

  beforeEach(() => {
    // Clean dist directory before each test
    if (existsSync(distPath)) {
      rmSync(distPath, { recursive: true, force: true });
    }
    // Restore original package.json before each test
    if (originalPackageJson) {
      writeFileSync(packageJsonPath, originalPackageJson, "utf8");
    }
  });

  test("build process should work with modified package.json version", async () => {
    const testVersion = "1.2.3-test";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    try {
      // Run the build process
      const result = await execAsync("bun", ["run", "build"], join(__dirname, "../.."));

      expect(result.code).toBe(0);

      // Check that version.generated.ts was created with the correct version
      expect(existsSync(versionGeneratedPath)).toBe(true);
      const generatedContent = readFileSync(versionGeneratedPath, "utf8");
      expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

      // Check that dist/index.js was created
      const distIndexPath = join(distPath, "index.js");
      expect(existsSync(distIndexPath)).toBe(true);
    } finally {
      // Restore original package.json
      if (originalPackageJson) {
        writeFileSync(packageJsonPath, originalPackageJson, "utf8");
      }
    }
  });

  test("generate-version script should work with valid package.json", async () => {
    // Ensure package.json is valid (it should be restored by afterEach)
    expect(() => JSON.parse(readFileSync(packageJsonPath, "utf8"))).not.toThrow();

    // Run the generate-version script
    const result = await execAsync("bun", ["run", "scripts/generate-version.ts"], join(__dirname, "../.."));

    expect(result.code).toBe(0);

    // Check that version.generated.ts was created
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain('export const CLI_VERSION = "');
  });

  test("generate-version script should work with modified package.json", async () => {
    const testVersion = "2.0.0-rc.1";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    try {
      // Run generate-version script to ensure it works with modified package.json
      const result = await execAsync("bun", ["run", "scripts/generate-version.ts"], join(__dirname, "../.."));
      expect(result.code).toBe(0);

      // Check that version.generated.ts was created with correct version
      expect(existsSync(versionGeneratedPath)).toBe(true);
      const generatedContent = readFileSync(versionGeneratedPath, "utf8");
      expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);
    } finally {
      // Restore original package.json
      if (originalPackageJson) {
        writeFileSync(packageJsonPath, originalPackageJson, "utf8");
      }
    }
  });

  test("build process should generate output files", async () => {
    const testVersion = "3.1.0";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    try {
      // Run the build process
      const buildResult = await execAsync("bun", ["run", "build"], join(__dirname, "../.."));

      expect(buildResult.code).toBe(0);

      // Check that version.generated.ts has the correct version
      expect(existsSync(versionGeneratedPath)).toBe(true);
      const generatedContent = readFileSync(versionGeneratedPath, "utf8");
      expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

      // Check that dist/index.js was created
      const distIndexPath = join(distPath, "index.js");
      expect(existsSync(distIndexPath)).toBe(true);
    } finally {
      // Restore original package.json
      if (originalPackageJson) {
        writeFileSync(packageJsonPath, originalPackageJson, "utf8");
      }
    }
  });
});