import { describe, expect, test } from "bun:test";
import { CLI_VERSION } from "../../src/lib/version.js";

describe("version.ts", () => {
  describe("CLI_VERSION export", () => {
    test("should export CLI_VERSION that behaves like a string", () => {
      expect(typeof CLI_VERSION).toBe("object");
      expect(CLI_VERSION).toBeTruthy();
      expect(String(CLI_VERSION)).toBeTruthy();
    });

    test("should be a valid version when package.json is valid", () => {
      // This test verifies that the version is properly loaded from package.json
      const version = String(CLI_VERSION);
      expect(version).not.toBe("0.0.0");
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test("should match semantic versioning pattern", () => {
      // Version should match semantic versioning pattern
      const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
      expect(String(CLI_VERSION)).toMatch(versionPattern);
    });

    test("should be a valid version string", () => {
      // Should not be empty or undefined
      const version = String(CLI_VERSION);
      expect(version.length).toBeGreaterThan(0);
      expect(version).not.toBe("undefined");
      expect(version).not.toBe("null");
    });
  });

  describe("version consistency", () => {
    test("should be consistent across multiple imports", async () => {
      // Import the version multiple times to ensure consistency
      const { CLI_VERSION: version1 } = await import("../../src/lib/version.js");
      const { CLI_VERSION: version2 } = await import("../../src/lib/version.js");
      
      expect(version1).toBe(version2);
      expect(version1).toBe(CLI_VERSION);
    });
  });
});