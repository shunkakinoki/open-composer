import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildCacheClearCommand,
  buildCacheCommand,
  buildCacheShowCommand,
  buildConfigCommand,
  buildGetCommand,
  buildSetCommand,
  buildShowCommand,
} from "../../src/commands/config-command.js";

// Mock config directory for testing
const mockConfigDir = join(homedir(), ".config", "open-composer-test");
const _mockConfigPath = join(mockConfigDir, "config.json");

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
    it("should build config command successfully", () => {
      const command = buildConfigCommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    it("should build individual subcommands successfully", () => {
      expect(buildGetCommand()).toBeDefined();
      expect(buildSetCommand()).toBeDefined();
      expect(buildShowCommand()).toBeDefined();
      expect(buildCacheCommand()).toBeDefined();
      expect(buildCacheClearCommand()).toBeDefined();
      expect(buildCacheShowCommand()).toBeDefined();
    });
  });

  describe("cache command", () => {
    describe("buildCacheCommand", () => {
      it("should build cache command successfully", () => {
        const command = buildCacheCommand();
        expect(command).toBeDefined();
        expect(typeof command).toBe("object");
      });
    });

    describe("buildCacheClearCommand", () => {
      it("should build cache clear command successfully", () => {
        const command = buildCacheClearCommand();
        expect(command).toBeDefined();
        expect(typeof command).toBe("object");
      });
    });

    describe("buildCacheShowCommand", () => {
      it("should build cache show command successfully", () => {
        const command = buildCacheShowCommand();
        expect(command).toBeDefined();
        expect(typeof command).toBe("object");
      });
    });
  });

  describe("config operations", () => {
    describe("get command", () => {
      it("should build get command with optional key parameter", () => {
        const command = buildGetCommand();
        expect(command).toBeDefined();
      });
    });

    describe("set command", () => {
      it("should build set command with required key and value parameters", () => {
        const command = buildSetCommand();
        expect(command).toBeDefined();
      });
    });

    describe("show command", () => {
      it("should build show command successfully", () => {
        const command = buildShowCommand();
        expect(command).toBeDefined();
      });
    });
  });
});
