import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { readFileSync, writeFileSync, unlinkSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    const { spawn } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(spawn);

    const result = await exec("bun", ["run", "build"], {
      cwd: join(__dirname, "../.."),
      stdio: "pipe",
    });

    expect(result.exitCode).toBe(0);

    // Check that version.generated.ts was created
    expect(existsSync(versionGeneratedPath)).toBe(true);
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

    // Check that dist/index.js was created
    const distIndexPath = join(distPath, "index.js");
    expect(existsSync(distIndexPath)).toBe(true);

    // Check that the version is embedded in the bundled output
    const bundledContent = readFileSync(distIndexPath, "utf8");
    expect(bundledContent).toContain(testVersion);
  });

  test("build process should handle version generation failure gracefully", async () => {
    // Create invalid package.json
    writeFileSync(packageJsonPath, '{"invalid": "json"', "utf8");

    // Run the build process
    const { spawn } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(spawn);

    const result = await exec("bun", ["run", "build"], {
      cwd: join(__dirname, "../.."),
      stdio: "pipe",
    });

    // Build should fail due to invalid package.json
    expect(result.exitCode).not.toBe(0);
  });

  test("prepublish process should embed correct version in platform binaries", async () => {
    const testVersion = "2.0.0-rc.1";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Run the prepublish process (this builds platform-specific binaries)
    const { spawn } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(spawn);

    const result = await exec("bun", ["run", "scripts/prepublish.ts"], {
      cwd: join(__dirname, "../.."),
      stdio: "pipe",
    });

    expect(result.exitCode).toBe(0);

    // Check that platform-specific packages were created
    const platformPackagesPath = join(distPath, "@open-composer");
    expect(existsSync(platformPackagesPath)).toBe(true);

    // Check a few platform packages
    const linuxX64Path = join(platformPackagesPath, "cli-linux-x64");
    expect(existsSync(linuxX64Path)).toBe(true);

    const packageJsonPath = join(linuxX64Path, "package.json");
    expect(existsSync(packageJsonPath)).toBe(true);

    const packageJsonContent = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    expect(packageJsonContent.version).toBe(testVersion);

    // Check that the binary was created
    const binaryPath = join(linuxX64Path, "bin", "open-composer");
    expect(existsSync(binaryPath)).toBe(true);
  });

  test("version should be consistent across all build outputs", async () => {
    const testVersion = "3.1.0";

    // Update package.json with test version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = testVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

    // Run the build process
    const { spawn } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(spawn);

    const buildResult = await exec("bun", ["run", "build"], {
      cwd: join(__dirname, "../.."),
      stdio: "pipe",
    });

    expect(buildResult.exitCode).toBe(0);

    // Run the prepublish process
    const prepublishResult = await exec("bun", ["run", "scripts/prepublish.ts"], {
      cwd: join(__dirname, "../.."),
      stdio: "pipe",
    });

    expect(prepublishResult.exitCode).toBe(0);

    // Check that version.generated.ts has the correct version
    const generatedContent = readFileSync(versionGeneratedPath, "utf8");
    expect(generatedContent).toContain(`export const CLI_VERSION = "${testVersion}";`);

    // Check that the bundled output has the correct version
    const distIndexPath = join(distPath, "index.js");
    const bundledContent = readFileSync(distIndexPath, "utf8");
    expect(bundledContent).toContain(testVersion);

    // Check that platform packages have the correct version
    const platformPackagesPath = join(distPath, "@open-composer");
    const linuxX64Path = join(platformPackagesPath, "cli-linux-x64");
    const packageJsonPath = join(linuxX64Path, "package.json");
    const packageJsonContent = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    expect(packageJsonContent.version).toBe(testVersion);
  });
});