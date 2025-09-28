import { describe, expect, it } from "bun:test";
import {
  buildDisableCommand,
  buildEnableCommand,
  buildResetCommand,
  buildStatusCommand,
  buildTelemetryCommand,
} from "../../src/commands/telemetry.js";

describe("telemetry command", () => {
  describe("buildTelemetryCommand", () => {
    it("should build telemetry command successfully", () => {
      const command = buildTelemetryCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });

  describe("subcommands", () => {
    it("should build enable command successfully", () => {
      const command = buildEnableCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build disable command successfully", () => {
      const command = buildDisableCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build status command successfully", () => {
      const command = buildStatusCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build reset command successfully", () => {
      const command = buildResetCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });
});
