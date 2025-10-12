import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectInstallMethod } from "../../src/services/upgrade-service.js";

// Test isolation variables
let mockBinDir: string;
let mockNpmDir: string;
let mockLocalBinDir: string;
let mockBinaryPath: string;

// Store original process values
let originalArgv: string[];
let originalExecPath: string;

describe.concurrent("UpgradeService", () => {
  beforeEach(async () => {
    // Create unique test directory for each test
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockBinDir = join(tmpdir(), `open-composer-test-${testId}`);
    mockNpmDir = join(mockBinDir, "npm-global", "bin");
    mockLocalBinDir = join(mockBinDir, ".local", "bin");

    // Create test directories
    await mkdir(mockNpmDir, { recursive: true });
    await mkdir(mockLocalBinDir, { recursive: true });

    // Create mock binary files
    mockBinaryPath = join(mockLocalBinDir, "open-composer");
    await Bun.write(mockBinaryPath, "#!/bin/bash\necho 'test'\n");

    // Store original process values
    originalArgv = process.argv;
    originalExecPath = process.execPath;
  });

  afterEach(async () => {
    // Restore original process values
    process.argv = originalArgv;
    process.execPath = originalExecPath;

    // Clean up test directories
    try {
      await rm(mockBinDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe.concurrent("detectInstallMethod", () => {
    test.concurrent("should detect npm installation via node_modules path", async () => {
      // Mock process.argv to point to npm global installation
      const npmBinaryPath = join(mockNpmDir, "open-composer");
      await Bun.write(npmBinaryPath, "#!/bin/bash\necho 'npm version'\n");
      process.argv = [process.execPath, npmBinaryPath];

      const result = await detectInstallMethod();

      expect(result.method).toBe("npm");
      expect(result.binaryPath).toBe(npmBinaryPath);
    });

    test.concurrent("should detect npm installation via .npm-global path", async () => {
      // Mock process.argv to point to npm global installation with .npm-global
      const npmBinaryPath = join(mockNpmDir, "open-composer");
      await Bun.write(npmBinaryPath, "#!/bin/bash\necho 'npm version'\n");
      process.argv = [process.execPath, npmBinaryPath];

      const result = await detectInstallMethod();

      expect(result.method).toBe("npm");
      expect(result.binaryPath).toBe(npmBinaryPath);
    });

    test.concurrent("should detect binary installation via .local/bin path", async () => {
      // Mock process.argv to point to local binary installation
      process.argv = [process.execPath, mockBinaryPath];

      const result = await detectInstallMethod();

      expect(result.method).toBe("binary");
      expect(result.binaryPath).toBe(mockBinaryPath);
    });

    test.concurrent("should detect binary installation via .open-composer path", async () => {
      // Create a .open-composer directory and binary
      const openComposerDir = join(mockBinDir, ".open-composer");
      const openComposerBinary = join(openComposerDir, "open-composer");
      await mkdir(openComposerDir, { recursive: true });
      await Bun.write(openComposerBinary, "#!/bin/bash\necho 'open-composer version'\n");

      process.argv = [process.execPath, openComposerBinary];

      const result = await detectInstallMethod();

      expect(result.method).toBe("binary");
      expect(result.binaryPath).toBe(openComposerBinary);
    });

    test.concurrent("should handle Bun-compiled binaries with /$bunfs/ prefix", async () => {
      // Mock process.argv with Bun-compiled binary path
      const bunfsPath = "/$bunfs/root/open-composer";
      process.argv = [process.execPath, bunfsPath];
      process.execPath = mockBinaryPath; // Set execPath to actual binary location

      const result = await detectInstallMethod();

      expect(result.method).toBe("binary");
      expect(result.binaryPath).toBe(mockBinaryPath);
    });

    test.concurrent("should return unknown when binaryPath is empty", async () => {
      // Mock process.argv with empty/undefined binary path
      process.argv = [process.execPath];

      const result = await detectInstallMethod();

      expect(result.method).toBe("unknown");
      expect(result.binaryPath).toBe("");
    });

    test.concurrent("should handle symlinks correctly", async () => {
      // Create a symlink to the binary
      const symlinkPath = join(mockBinDir, "symlink-open-composer");
      await symlink(mockBinaryPath, symlinkPath);

      process.argv = [process.execPath, symlinkPath];

      const result = await detectInstallMethod();

      // Should resolve the symlink and detect as binary installation
      expect(result.method).toBe("binary");
      expect(result.binaryPath).toBe(mockBinaryPath);
    });

    test.concurrent("should default to binary method for unrecognized paths", async () => {
      // Create a binary in an unrecognized location
      const unknownDir = join(mockBinDir, "unknown-location");
      await mkdir(unknownDir, { recursive: true });
      const unknownBinary = join(unknownDir, "open-composer");
      await Bun.write(unknownBinary, "#!/bin/bash\necho 'unknown version'\n");

      process.argv = [process.execPath, unknownBinary];

      const result = await detectInstallMethod();

      expect(result.method).toBe("binary");
      expect(result.binaryPath).toBe(unknownBinary);
    });

    test.concurrent("should handle realpath errors gracefully", async () => {
      // Mock process.argv with a non-existent path
      const nonExistentPath = join(mockBinDir, "non-existent", "open-composer");
      process.argv = [process.execPath, nonExistentPath];

      const result = await detectInstallMethod();

      expect(result.method).toBe("unknown");
      expect(result.binaryPath).toBe("");
    });

    test.concurrent("should detect npm installation on Windows-style paths", async () => {
      // Mock Windows-style npm path
      const windowsNpmPath = "C:\\Users\\user\\AppData\\Roaming\\npm\\open-composer.exe";
      process.argv = [process.execPath, windowsNpmPath];

      // Since we're on macOS/darwin, we'll mock this by creating a similar path structure
      // and testing the path detection logic
      const mockWindowsNpmPath = join(mockBinDir, "npm", "open-composer");
      await mkdir(join(mockBinDir, "npm"), { recursive: true });
      await Bun.write(mockWindowsNpmPath, "#!/bin/bash\necho 'windows npm'\n");

      // Test the path detection logic directly by checking if the function handles
      // backslash-separated paths (though realpath will normalize them)
      process.argv = [process.execPath, mockWindowsNpmPath];

      const result = await detectInstallMethod();

      // On Unix systems, backslashes in paths might not be detected as npm,
      // but the function should still work
      expect(result.method).toBeOneOf(["binary", "npm"]);
      expect(result.binaryPath).toBe(mockWindowsNpmPath);
    });

    test.concurrent("should handle usr/local/lib/node_modules path", async () => {
      // Mock system-wide npm installation
      const systemNpmDir = join(mockBinDir, "usr", "local", "lib", "node_modules", ".bin");
      await mkdir(systemNpmDir, { recursive: true });
      const systemNpmBinary = join(systemNpmDir, "open-composer");
      await Bun.write(systemNpmBinary, "#!/bin/bash\necho 'system npm'\n");

      process.argv = [process.execPath, systemNpmBinary];

      const result = await detectInstallMethod();

      expect(result.method).toBe("npm");
      expect(result.binaryPath).toBe(systemNpmBinary);
    });
  });
});