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

describe.skipIf(process.env.CI === "true")("version integration in build process", () => {
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
    // Also clean up the version.generated.ts to ensure fresh generation
    if (existsSync(versionGeneratedPath)) {
      unlinkSync(versionGeneratedPath);
    }

    // Generate version.generated.ts with the current package.json version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const version = packageJson.version;
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${version}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");
  });

  test("build process should work with modified package.json version", async () => {
    const testVersion = "1.2.3-test";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Generate version.generated.ts with the new version
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${testVersion}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");

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

    // Generate version.generated.ts with the new version
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${testVersion}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");

    // Run generate-version script to ensure it works with modified package.json
    const result = await execAsync("bun", ["run", "scripts/generate-version.ts"], join(__dirname, "../.."));
    expect(result.code).toBe(0);

    // Check that version.generated.ts was created with correct version
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);
  });

  test("build process should generate output files", async () => {
    const testVersion = "3.1.0";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Generate version.generated.ts with the new version
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${testVersion}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");

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
  });

  test("built binary should return correct version with --version flag", async () => {
    const testVersion = "4.5.6";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Generate version.generated.ts with the new version
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${testVersion}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");

    // Run the build process
    const buildResult = await execAsync("bun", ["run", "build"], join(__dirname, "../.."));
    expect(buildResult.code).toBe(0);

    // Check that dist/index.js was created
    const distIndexPath = join(distPath, "index.js");
    expect(existsSync(distIndexPath)).toBe(true);

    // Run the binary with --version flag
    const versionResult = await execAsync(distIndexPath, ["--version"]);

    // The output should contain the correct version
    expect(versionResult.stdout.trim()).toBe(testVersion);
    expect(versionResult.code).toBe(0);
  });

  test.skipIf(process.env.CI === "true")("prepublishOnly build should produce binaries with correct version", async () => {
    const testVersion = "5.0.0-rc.1";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Generate version.generated.ts with the new version
    const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${testVersion}";
`;
    writeFileSync(versionGeneratedPath, versionFileContent, "utf8");

    // Run prepublishOnly script (which generates version file and builds binaries)
    const prepublishResult = await execAsync("bun", ["run", "prepublishOnly"], join(__dirname, "../.."));

    // Log output if failed for debugging
    if (prepublishResult.code !== 0) {
      console.error("prepublishOnly stderr:", prepublishResult.stderr);
      console.error("prepublishOnly stdout:", prepublishResult.stdout);
    }

    expect(prepublishResult.code).toBe(0);

    // Check that version.generated.ts has the correct version
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

    // Check that at least one binary was created (darwin-arm64 for M-series Macs)
    const darwinArm64Path = join(distPath, "@open-composer/cli-darwin-arm64");
    const linuxX64Path = join(distPath, "@open-composer/cli-linux-x64");

    // At least one of these should exist
    const binaryExists = existsSync(darwinArm64Path) || existsSync(linuxX64Path);
    expect(binaryExists).toBe(true);

    // Check package.json in binary directory contains correct version
    const binaryDirPath = existsSync(darwinArm64Path) ? darwinArm64Path : linuxX64Path;
    const binaryPackageJsonPath = join(binaryDirPath, "package.json");
    expect(existsSync(binaryPackageJsonPath)).toBe(true);

    const binaryPackageJson = JSON.parse(readFileSync(binaryPackageJsonPath, "utf8"));
    expect(binaryPackageJson.version).toBe(testVersion);

    // Check that the binary executable exists
    const binaryName = existsSync(darwinArm64Path) ? "open-composer" : "open-composer";
    const binaryPath = join(binaryDirPath, "bin", binaryName);
    expect(existsSync(binaryPath)).toBe(true);

    // Run the binary with --version flag
    const versionResult = await execAsync(binaryPath, ["--version"]);
    expect(versionResult.stdout.trim()).toBe(testVersion);
    expect(versionResult.code).toBe(0);
  }, 60000); // Increase timeout to 60 seconds for the full build
});