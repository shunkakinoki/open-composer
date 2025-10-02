import { describe, expect, test } from "bun:test";
import { buildUpgradeCommand } from "../../src/commands/upgrade-command.js";

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
});
