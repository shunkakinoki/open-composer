import { describe, expect, test } from "bun:test";
import { CLI_VERSION } from "../../src/lib/version.js";

describe("version display in components", () => {
  test("CLI_VERSION should behave like a string", () => {
    expect(typeof CLI_VERSION).toBe("object");
    expect(CLI_VERSION).toBeTruthy();
    expect(String(CLI_VERSION)).toBeTruthy();
  });

  test("CLI_VERSION should be a valid version in normal operation", () => {
    // This test verifies that the version is properly loaded from package.json
    const version = String(CLI_VERSION);
    expect(version).not.toBe("0.0.0");
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("CLI_VERSION should match expected format", () => {
    // Version should match semantic versioning pattern
    const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    expect(String(CLI_VERSION)).toMatch(versionPattern);
  });

  test("version should be suitable for display in components", () => {
    // Test that the version can be used in string interpolation
    const version = String(CLI_VERSION);
    const welcomeText = `🎼 Open Composer CLI v${CLI_VERSION}`;
    const layoutText = `🎼 Open Composer CLI v${CLI_VERSION}`;

    expect(welcomeText).toContain(version);
    expect(layoutText).toContain(version);
    expect(welcomeText).toMatch(/🎼 Open Composer CLI v\d+\.\d+\.\d+/);
    expect(layoutText).toMatch(/🎼 Open Composer CLI v\d+\.\d+\.\d+/);
  });

  test("version should be consistent for telemetry and commands", () => {
    // Test that the version can be used in various contexts
    const telemetryData = { version: CLI_VERSION, source: "cli" };
    const commandConfig = { version: CLI_VERSION };
    
    expect(telemetryData.version).toBe(CLI_VERSION);
    expect(commandConfig.version).toBe(CLI_VERSION);
    expect(telemetryData.version).toBe(commandConfig.version);
  });
});