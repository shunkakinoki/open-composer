import { describe, expect, test } from "bun:test";
import {
  buildActivateCommand,
  buildAgentsCommand,
  buildDeactivateCommand,
  buildListCommand,
  buildRouteCommand,
} from "../../src/commands/agents-command.js";

describe.concurrent("agents command", () => {
  describe.concurrent("command structure", () => {
    test.concurrent("should build agents command successfully", () => {
      const command = buildAgentsCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.concurrent("should build individual subcommands successfully", () => {
      expect(buildListCommand()).toBeDefined();
      expect(buildActivateCommand()).toBeDefined();
      expect(buildDeactivateCommand()).toBeDefined();
      expect(buildRouteCommand()).toBeDefined();
    });
  });
});
