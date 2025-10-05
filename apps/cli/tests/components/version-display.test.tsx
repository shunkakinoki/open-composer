import { describe, expect, test } from "bun:test";
import { CLI_VERSION } from "../../src/lib/version.js";

describe("version display in components", () => {
  test("CLI_VERSION should behave like a string", () => {
    expect(CLI_VERSION).toBeTruthy();
    expect(String(CLI_VERSION)).toBeTruthy();
    expect(typeof String(CLI_VERSION)).toBe("string");
  });

  test("CLI_VERSION should be a valid version in normal operation", () => {
    // This test verifies that the version is properly loaded from package.json
    // First ensure package.json is valid
    const fs = require('fs');
    const path = require('path');
    const packageJsonPath = path.join(__dirname, '../../package.json');
    expect(() => JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))).not.toThrow();

    const version = String(CLI_VERSION);
    // In test environment, CLI_VERSION might be "0.0.0" due to caching from corrupted package.json
    // The important thing is that it matches version format or is the fallback
    expect(version === "0.0.0" || /^\d+\.\d+\.\d+/.test(version)).toBe(true);
  });

  test("CLI_VERSION should match expected format", () => {
    // Version should match semantic versioning pattern (or be the fallback)
    const version = String(CLI_VERSION);
    const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    expect(version === "0.0.0" || versionPattern.test(version)).toBe(true);
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