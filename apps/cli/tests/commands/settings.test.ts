import { describe, expect, it } from "bun:test";
import {
  buildDeleteCommand,
  buildGetCommand,
  buildListCommand,
  buildSetCommand,
  buildSettingsCommand,
} from "../../src/commands/settings-command.js";

describe("settings command", () => {
  describe("buildSettingsCommand", () => {
    it("should build settings command successfully", () => {
      const command = buildSettingsCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });

  describe("subcommands", () => {
    it("should build get command successfully", () => {
      const command = buildGetCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build set command successfully", () => {
      const command = buildSetCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build list command successfully", () => {
      const command = buildListCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build delete command successfully", () => {
      const command = buildDeleteCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });
});
