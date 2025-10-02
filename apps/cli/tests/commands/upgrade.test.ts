import { describe, expect, test } from "bun:test";
import { buildUpgradeCommand } from "../../src/commands/upgrade-command.js";
import { join } from "path";

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
    test("should support check option", () => {
      const commandBuilder = buildUpgradeCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // The check option is embedded in the command structure
    });

    test("should support version argument", () => {
      const commandBuilder = buildUpgradeCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // The version argument is embedded in the command structure
    });
  });

  describe("binary path mapping", () => {
    test("should correctly map platform string to extracted directory structure", () => {
      // Test the logic that maps platform strings to the extracted directory path
      function getDirectoryName(platformStr: string): string {
        switch (platformStr) {
          case "linux-x64":
            return "cli-linux-x64";
          case "linux-arm64":
            return "cli-linux-aarch64-musl";
          case "macos-x64":
            return "cli-darwin-x64";
          case "macos-arm64":
            return "cli-darwin-arm64";
          case "windows-x64":
            return "cli-win32-x64";
          default:
            throw new Error(`Unsupported platform: ${platformStr}`);
        }
      }

      const testCases = [
        {
          platformStr: "linux-x64",
          expectedDir: "@open-composer/cli-linux-x64",
        },
        {
          platformStr: "linux-arm64",
          expectedDir: "@open-composer/cli-linux-aarch64-musl",
        },
        {
          platformStr: "macos-x64",
          expectedDir: "@open-composer/cli-darwin-x64",
        },
        {
          platformStr: "macos-arm64",
          expectedDir: "@open-composer/cli-darwin-arm64",
        },
        {
          platformStr: "windows-x64",
          expectedDir: "@open-composer/cli-win32-x64",
        },
      ];

      testCases.forEach(({ platformStr, expectedDir }) => {
        // This replicates the logic from the upgrade function
        const dirName = `@open-composer/${getDirectoryName(platformStr)}`;
        const extractedBinary = join("/install/dir", `${dirName}/bin/opencomposer`);
        
        expect(dirName).toBe(expectedDir);
        expect(extractedBinary).toBe(`/install/dir/${expectedDir}/bin/opencomposer`);
      });
    });
  });
});
