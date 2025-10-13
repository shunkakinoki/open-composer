import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

// Mock fs/promises before importing detectInstallMethod
const mockRealpath = mock((path: string) => Promise.resolve(path));
mock.module("node:fs/promises", () => ({
  realpath: mockRealpath,
}));

import { detectInstallMethod } from "../../src/services/upgrade-service.js";

describe.concurrent("UpgradeService", () => {
  let mockBinDir: string;
  let mockNpmDir: string;
  let originalArgv: string[];
  let originalExecPath: string;

  beforeEach(async () => {
    // Create temporary directories for testing
    mockBinDir = join(tmpdir(), "open-composer-test-bin");
    mockNpmDir = join(tmpdir(), "open-composer-test-npm");
    
    await mkdir(mockBinDir, { recursive: true });
    await mkdir(mockNpmDir, { recursive: true });

    // Store original process values
    originalArgv = process.argv;
    originalExecPath = process.execPath;

    // Clear mock
    mockRealpath.mockClear();
    mockRealpath.mockImplementation((path: string) => Promise.resolve(path));
  });

  afterEach(async () => {
    // Restore original process values
    Object.defineProperty(process, 'argv', { value: originalArgv, configurable: true });
Object.defineProperty(process, 'execPath', { value: originalExecPath, configurable: true });

// Clean up temporary directories
try {
await rm(mockBinDir, { recursive: true, force: true });
await rm(mockNpmDir, { recursive: true, force: true });
} catch {
// Ignore cleanup errors
}
});

describe.concurrent("detectInstallMethod", () => {
test.concurrent("should detect npm installation via node_modules path", async () => {
// Mock process.argv to point to npm global installation
const npmBinaryPath = join(mockNpmDir, "node_modules", ".bin", "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, npmBinaryPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("npm");
expect(result.binaryPath).toBe(npmBinaryPath);
});

test.concurrent("should detect npm installation via .npm-global path", async () => {
// Mock process.argv to point to npm global installation with .npm-global
const npmBinaryPath = join(mockNpmDir, ".npm-global", "bin", "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, npmBinaryPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("npm");
expect(result.binaryPath).toBe(npmBinaryPath);
});

test.concurrent("should detect Windows npm installation", async () => {
// Mock process.argv with Windows-style npm path
const windowsNpmPath = "C:\\Users\\test\\AppData\\Roaming\\npm\\open-composer.cmd";
Object.defineProperty(process, 'argv', {
value: [process.execPath, windowsNpmPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("npm");
expect(result.binaryPath).toBe(windowsNpmPath);
});

test.concurrent("should detect binary installation when no npm patterns match", async () => {
// Mock process.argv with binary installation path
const binaryPath = join(mockBinDir, "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, binaryPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("binary");
expect(result.binaryPath).toBe(binaryPath);
});

test.concurrent("should detect binary installation for symlinked executables", async () => {
// Mock process.argv with symlinked binary path
const symlinkedPath = "/usr/local/bin/open-composer";
Object.defineProperty(process, 'argv', {
value: [process.execPath, symlinkedPath],
configurable: true
});

// Mock realpath to resolve to a binary installation
mockRealpath.mockResolvedValueOnce(join(mockBinDir, "real-open-composer"));

const result = await detectInstallMethod();
expect(result.method).toBe("binary");
expect(result.binaryPath).toBe(join(mockBinDir, "real-open-composer"));
});

test.concurrent("should handle Bun-compiled binaries with /$bunfs/ prefix", async () => {
// Mock process.argv with Bun-compiled binary path
const bunfsPath = "/$bunfs/root/open-composer";
const mockBinaryPath = join(mockBinDir, "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, bunfsPath],
configurable: true
});
Object.defineProperty(process, 'execPath', {
value: mockBinaryPath,
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("binary");
expect(result.binaryPath).toBe(mockBinaryPath);
});

test.concurrent("should return unknown when binaryPath is empty", async () => {
// Mock process.argv with empty/undefined binary path
Object.defineProperty(process, 'argv', {
value: [process.execPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("unknown");
expect(result.binaryPath).toBe("");
});

test.concurrent("should handle realpath errors gracefully", async () => {
// Mock process.argv with valid path
const testPath = join(mockBinDir, "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, testPath],
configurable: true
});

// Mock realpath to throw an error
mockRealpath.mockRejectedValueOnce(new Error("realpath failed"));

const result = await detectInstallMethod();
expect(result.method).toBe("unknown");
expect(result.binaryPath).toBe("");
});

test.concurrent("should detect npm installation on Windows-style paths", async () => {
// Mock process.argv with Windows-style npm path containing backslashes
const windowsPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\open-composer";
Object.defineProperty(process, 'argv', {
value: [process.execPath, windowsPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("npm");
expect(result.binaryPath).toBe(windowsPath);
});

test.concurrent("should handle symlinks correctly", async () => {
// Mock process.argv with symlinked path
const symlinkPath = join(mockBinDir, "symlink-open-composer");
const realPath = join(mockBinDir, "real-open-composer");

Object.defineProperty(process, 'argv', {
value: [process.execPath, symlinkPath],
configurable: true
});

// Mock realpath to resolve the symlink
mockRealpath.mockResolvedValueOnce(realPath);

const result = await detectInstallMethod();
expect(result.method).toBe("binary");
expect(result.binaryPath).toBe(realPath);
});

test.concurrent("should detect binary installation via .open-composer path", async () => {
// Mock process.argv with .open-composer installation path
const openComposerPath = join(mockBinDir, ".open-composer", "bin", "open-composer");
Object.defineProperty(process, 'argv', {
value: [process.execPath, openComposerPath],
configurable: true
});

const result = await detectInstallMethod();
expect(result.method).toBe("binary");
expect(result.binaryPath).toBe(openComposerPath);
});
});
});
