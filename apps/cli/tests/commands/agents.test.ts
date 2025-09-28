import { describe, expect, it } from "bun:test";
import {
  buildActivateCommand,
  buildAgentsCommand,
  buildDeactivateCommand,
  buildListCommand,
  buildRouteCommand,
} from "../../src/commands/agents.js";

describe("agents command", () => {
  describe("command structure", () => {
    it("should build agents command successfully", () => {
      const command = buildAgentsCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build individual subcommands successfully", () => {
      expect(buildListCommand()).toBeDefined();
      expect(buildActivateCommand()).toBeDefined();
      expect(buildDeactivateCommand()).toBeDefined();
      expect(buildRouteCommand()).toBeDefined();
    });
  });
});
