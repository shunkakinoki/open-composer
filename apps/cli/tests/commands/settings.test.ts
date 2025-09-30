import { describe, expect, test } from "bun:test";
import {
  buildDeleteCommand,
  buildGetCommand,
  buildListCommand,
  buildSetCommand,
  buildSettingsCommand,
} from "../../src/commands/settings-command.js";

describe.concurrent("settings command", () => {
  describe.concurrent("buildSettingsCommand", () => {
    test.concurrent("should build settings command successfully", () => {
      const command = buildSettingsCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });

  describe.concurrent("subcommands", () => {
    test.concurrent("should build get command successfully", () => {
      const command = buildGetCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.concurrent("should build set command successfully", () => {
      const command = buildSetCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.concurrent("should build list command successfully", () => {
      const command = buildListCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.concurrent("should build delete command successfully", () => {
      const command = buildDeleteCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });
});
