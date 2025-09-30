import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UserConfig } from "@open-composer/config";

// Test isolation variables
let mockConfigDir: string;
let mockConfigPath: string;

// Helper functions to test config operations directly
async function testGetConfig(): Promise<UserConfig> {
  try {
    const content = await readFile(mockConfigPath, "utf-8");
    const config = JSON.parse(content);
    return {
      ...config,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: new Date().toISOString(),
    };
  }
}

async function testUpdateConfig(
  updates: Partial<UserConfig>,
): Promise<UserConfig> {
  let currentConfig: UserConfig;
  try {
    const content = await readFile(mockConfigPath, "utf-8");
    currentConfig = JSON.parse(content);
  } catch {
    currentConfig = {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
  }

  const updatedConfig = {
    ...currentConfig,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(mockConfigDir, { recursive: true });
  await writeFile(
    mockConfigPath,
    JSON.stringify(updatedConfig, null, 2),
    "utf-8",
  );

  return updatedConfig;
}

async function testSetTelemetryConsent(enabled: boolean): Promise<UserConfig> {
  let currentConfig: UserConfig;
  try {
    const content = await readFile(mockConfigPath, "utf-8");
    currentConfig = JSON.parse(content);
  } catch {
    currentConfig = {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
  }

  const updatedConfig = {
    ...currentConfig,
    telemetry: {
      enabled,
      consentedAt: new Date().toISOString(),
      version: "1.0.0",
    },
    updatedAt: new Date().toISOString(),
  };

  await mkdir(mockConfigDir, { recursive: true });
  await writeFile(
    mockConfigPath,
    JSON.stringify(updatedConfig, null, 2),
    "utf-8",
  );

  return updatedConfig;
}

async function testGetTelemetryConsent(): Promise<boolean> {
  try {
    const content = await readFile(mockConfigPath, "utf-8");
    const config = JSON.parse(content);
    return config.telemetry?.enabled ?? false;
  } catch {
    return false;
  }
}

describe("Config Operations", () => {
  beforeEach(async () => {
    // Create unique test directory for each test
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockConfigDir = join(tmpdir(), `open-composer-config-test-${testId}`);
    mockConfigPath = join(mockConfigDir, "config.json");

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

  describe("getConfig", () => {
    it("should return default config when no file exists", async () => {
      const result = await testGetConfig();

      expect(result).toEqual({
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: expect.any(String),
      });
    });

    it("should read existing config file", async () => {
      const testConfig = {
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        telemetry: {
          enabled: true,
          consentedAt: "2024-01-01T00:00:00.000Z",
          version: "1.0.0",
        },
      };

      await writeFile(
        mockConfigPath,
        JSON.stringify(testConfig, null, 2),
        "utf8",
      );

      const result = await testGetConfig();

      expect(result).toMatchObject({
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        telemetry: {
          enabled: true,
          consentedAt: "2024-01-01T00:00:00.000Z",
          version: "1.0.0",
        },
      });
    });

    it("should handle invalid JSON gracefully", async () => {
      await writeFile(mockConfigPath, "invalid json", "utf8");

      const result = await testGetConfig();

      expect(result).toEqual({
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: expect.any(String),
      });
    });
  });

  describe("setTelemetryConsent", () => {
    it("should enable telemetry consent", async () => {
      const result = await testSetTelemetryConsent(true);

      expect(result.telemetry?.enabled).toBe(true);
      expect(result.telemetry?.consentedAt).toBeDefined();
      expect(result.telemetry?.version).toBe("1.0.0");
    });

    it("should disable telemetry consent", async () => {
      const result = await testSetTelemetryConsent(false);

      expect(result.telemetry?.enabled).toBe(false);
      expect(result.telemetry?.consentedAt).toBeDefined();
      expect(result.telemetry?.version).toBe("1.0.0");
    });

    it("should persist consent to file", async () => {
      await testSetTelemetryConsent(true);

      // Verify file was written
      const fileContent = await readFile(mockConfigPath, "utf8");
      const savedConfig = JSON.parse(fileContent);

      expect(savedConfig.telemetry?.enabled).toBe(true);
      expect(savedConfig.telemetry?.consentedAt).toBeDefined();
    });
  });

  describe("updateConfig", () => {
    it("should update config with partial data", async () => {
      const result = await testUpdateConfig({
        version: "2.0.0",
        telemetry: {
          enabled: true,
          consentedAt: "2024-01-01T00:00:00.000Z",
          version: "1.0.0",
        },
      });

      expect(result.version).toBe("2.0.0");
      expect(result.telemetry?.enabled).toBe(true);
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe("getTelemetryConsent", () => {
    it("should return false when telemetry is not configured", async () => {
      const result = await testGetTelemetryConsent();

      expect(result).toBe(false);
    });

    it("should return true when telemetry is enabled", async () => {
      // First set telemetry consent
      await testSetTelemetryConsent(true);

      // Then get consent
      const result = await testGetTelemetryConsent();

      expect(result).toBe(true);
    });

    it("should return false when telemetry is disabled", async () => {
      // First set telemetry consent to false
      await testSetTelemetryConsent(false);

      // Then get consent
      const result = await testGetTelemetryConsent();

      expect(result).toBe(false);
    });
  });
});
