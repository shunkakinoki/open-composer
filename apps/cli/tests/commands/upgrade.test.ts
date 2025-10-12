import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

// Mock fs/promises before importing detectInstallMethod
const mockRealpath = mock((path: string) => Promise.resolve(path));
mock.module("node:fs/promises", () => ({
  realpath: mockRealpath,
}));

import { buildUpgradeCommand, detectInstallMethod } from "../../src/commands/upgrade-command.js";

describe("upgrade command", () => {
  describe("command structure", () => {
    test("should build upgrade command successfully", () => {
      const commandBuilder = buildUpgradeCommand();
      expect(commandBuilder).toBeDefined();
      expect(commandBuilder.metadata).toBeDefined();
      expect(commandBuilder.metadata.name).toBe("upgrade");
      expect(commandBuilder.metadata.description).toBe(
        "Upgrade to the latest version",
      );
    });

    test("should have correct metadata", () => {
      const commandBuilder = buildUpgradeCommand();
      expect(commandBuilder.metadata.name).toBe("upgrade");
      expect(commandBuilder.metadata.description).toContain("Upgrade");
    });

    test("should export command function", () => {
      const commandBuilder = buildUpgradeCommand();
      expect(commandBuilder.command).toBeDefined();
      expect(typeof commandBuilder.command).toBe("function");
    });

    test("command should be callable", () => {
      const commandBuilder = buildUpgradeCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
    });
  });

  describe("command options", () => {
    test("should have correct command builder structure", () => {
      const commandBuilder = buildUpgradeCommand();
      expect(commandBuilder).toBeDefined();
      expect(commandBuilder).toHaveProperty("command");
      expect(commandBuilder).toHaveProperty("metadata");
      expect(commandBuilder.metadata.name).toBe("upgrade");
      expect(commandBuilder.metadata.description).toBe(
        "Upgrade to the latest version",
      );
    });

    test("should export command function", () => {
      const commandBuilder = buildUpgradeCommand();
      expect(commandBuilder.command).toBeDefined();
      expect(typeof commandBuilder.command).toBe("function");
    });
  });

  describe("detectInstallMethod", () => {
    const originalArgv = process.argv;
    const originalExecPath = process.execPath;

    beforeEach(() => {
      mockRealpath.mockClear();
      mockRealpath.mockImplementation((path: string) => Promise.resolve(path));
    });

    afterEach(() => {
      // Restore original process properties
      Object.defineProperty(process, 'argv', { value: originalArgv, configurable: true });
      Object.defineProperty(process, 'execPath', { value: originalExecPath, configurable: true });
    });

    describe("Bun-compiled binaries", () => {
      test("should detect binary installation for Bun-compiled executables", async () => {
        // Mock process.argv to simulate Bun-compiled binary (argv[1] is bunfs path)
        Object.defineProperty(process, 'argv', { value: ['bun', '/$bunfs/root/open-composer'], configurable: true });
        Object.defineProperty(process, 'execPath', { value: '/Users/test/.local/bin/open-composer', configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("binary");
        expect(result.binaryPath).toBe("/Users/test/.local/bin/open-composer");
      });

      test("should detect binary installation in .open-composer directory", async () => {
        Object.defineProperty(process, 'argv', { value: ['bun', '/$bunfs/root/open-composer'], configurable: true });
        Object.defineProperty(process, 'execPath', { value: '/opt/open-composer/bin/open-composer', configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("binary");
        expect(result.binaryPath).toBe("/opt/open-composer/bin/open-composer");
      });
    });

    describe("npm installations", () => {
      test("should detect npm global installation in node_modules", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/usr/local/lib/node_modules/@open-composer/cli/bin/open-composer.js', 'upgrade'], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("npm");
        expect(result.binaryPath).toBe("/usr/local/lib/node_modules/@open-composer/cli/bin/open-composer.js");
      });

      test("should detect npm installation with .npm-global", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/Users/test/.npm-global/bin/open-composer', 'upgrade'], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("npm");
        expect(result.binaryPath).toBe("/Users/test/.npm-global/bin/open-composer");
      });

      test("should detect Windows npm installation", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', 'C:\\Users\\test\\AppData\\Roaming\\npm\\open-composer.cmd', 'upgrade'], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("npm");
        expect(result.binaryPath).toBe("C:\\Users\\test\\AppData\\Roaming\\npm\\open-composer.cmd");
      });
    });

    describe("binary installations", () => {
      test("should detect binary installation when no npm patterns match", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/usr/local/bin/open-composer', 'upgrade'], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("binary");
        expect(result.binaryPath).toBe("/usr/local/bin/open-composer");
      });

      test("should detect binary installation for symlinked executables", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/usr/bin/oc', 'upgrade'], configurable: true });
        mockRealpath.mockImplementation(() => Promise.resolve('/opt/binaries/open-composer'));

        const result = await detectInstallMethod();
        expect(result.method).toBe("binary");
        expect(result.binaryPath).toBe("/opt/binaries/open-composer");
      });
    });

    describe("error handling", () => {
      test("should return unknown when process.argv[1] is undefined", async () => {
        Object.defineProperty(process, 'argv', { value: [undefined], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("unknown");
        expect(result.binaryPath).toBe("");
      });

      test("should return unknown when realpath fails", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/nonexistent/path/open-composer', 'upgrade'], configurable: true });
        mockRealpath.mockImplementation(() => Promise.reject(new Error('ENOENT')));

        const result = await detectInstallMethod();
        expect(result.method).toBe("unknown");
        expect(result.binaryPath).toBe("");
      });
    });

    describe("regular Node.js scripts", () => {
      test("should handle regular Node.js script execution", async () => {
        Object.defineProperty(process, 'argv', { value: ['node', '/path/to/script.js', 'upgrade'], configurable: true });

        const result = await detectInstallMethod();
        expect(result.method).toBe("binary");
        expect(result.binaryPath).toBe("/path/to/script.js");
      });
    });
  });
});
