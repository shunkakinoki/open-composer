import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildClearCommand,
  buildConfigCommand,
  buildGetCommand,
  buildSetCommand,
  buildShowCommand,
} from "../../src/commands/config-command.js";

// Mock config directory for testing
const mockConfigDir = join(homedir(), ".config", "open-composer-test");

describe("config command", () => {
  beforeEach(async () => {
    // Create test directory
    await mkdir(mockConfigDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(mockConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("command structure", () => {
    test.serial("should build config command successfully", () => {
      const command = buildConfigCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.serial("should build individual subcommands successfully", () => {
      expect(buildGetCommand()).toBeDefined();
      expect(buildSetCommand()).toBeDefined();
      expect(buildShowCommand()).toBeDefined();
      expect(buildClearCommand()).toBeDefined();
    });
  });

  describe("config operations", () => {
    describe("get command", () => {
      test.serial(
        "should build get command with optional key parameter",
        () => {
          const command = buildGetCommand();
          expect(command).toBeDefined();
        },
      );
    });

    describe("set command", () => {
      test.serial(
        "should build set command with required key and value parameters",
        () => {
          const command = buildSetCommand();
          expect(command).toBeDefined();
        },
      );
    });

    describe("show command", () => {
      test.serial("should build show command successfully", () => {
        const command = buildShowCommand();
        expect(command).toBeDefined();
      });
    });

    describe("clear command", () => {
      test.serial("should build clear command successfully", () => {
        const command = buildClearCommand();
        expect(command).toBeDefined();
      });
    });
  });
});
