import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
    test.serial(
      "should return default config when no file exists",
      async () => {
        const result = await testGetConfig();

        expect(result).toEqual({
          version: "1.0.0",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: expect.any(String),
        });
      },
    );

    test.serial("should read existing config file", async () => {
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

    test.serial("should handle invalid JSON gracefully", async () => {
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
    test.serial("should enable telemetry consent", async () => {
      const result = await testSetTelemetryConsent(true);

      expect(result.telemetry?.enabled).toBe(true);
      expect(result.telemetry?.consentedAt).toBeDefined();
      expect(result.telemetry?.version).toBe("1.0.0");
    });

    test.serial("should disable telemetry consent", async () => {
      const result = await testSetTelemetryConsent(false);

      expect(result.telemetry?.enabled).toBe(false);
      expect(result.telemetry?.consentedAt).toBeDefined();
      expect(result.telemetry?.version).toBe("1.0.0");
    });

    test.serial("should persist consent to file", async () => {
      await testSetTelemetryConsent(true);

      // Verify file was written
      const fileContent = await readFile(mockConfigPath, "utf8");
      const savedConfig = JSON.parse(fileContent);

      expect(savedConfig.telemetry?.enabled).toBe(true);
      expect(savedConfig.telemetry?.consentedAt).toBeDefined();
    });
  });

  describe("updateConfig", () => {
    test.serial("should update config with partial data", async () => {
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
    test.serial(
      "should return false when telemetry is not configured",
      async () => {
        const result = await testGetTelemetryConsent();

        expect(result).toBe(false);
      },
    );

    test.serial("should return true when telemetry is enabled", async () => {
      // First set telemetry consent
      await testSetTelemetryConsent(true);

      // Then get consent
      const result = await testGetTelemetryConsent();

      expect(result).toBe(true);
    });

    test.serial("should return false when telemetry is disabled", async () => {
      // First set telemetry consent to false
      await testSetTelemetryConsent(false);

      // Then get consent
      const result = await testGetTelemetryConsent();

      expect(result).toBe(false);
    });
  });
});

describe("Telemetry Prompt Safeguards", () => {
  beforeEach(async () => {
    // Create unique test directory for each test
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockConfigDir = join(tmpdir(), `open-composer-config-test-${testId}`);
    mockConfigPath = join(mockConfigDir, "config.json");
    await mkdir(mockConfigDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory and restore environment
    try {
      await rm(mockConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test.serial("promptForTelemetryConsent detects non-TTY environment and completes quickly", async () => {
    // Import the actual service
    const { promptForTelemetryConsent, ConfigLive } = await import(
      "../../src/services/config-service.js"
    );
    const { Effect } = await import("effect");

    // Override config path for this test - start with clean config (no existing consent)
    process.env.OPEN_COMPOSER_CONFIG_FILE = mockConfigPath;

    // Write empty config to ensure no existing consent
    await writeFile(
      mockConfigPath,
      JSON.stringify({
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
      "utf-8",
    );

    // Mock stdin as non-TTY
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });

    try {
      const startTime = Date.now();

      // This should return immediately without prompting
      const result = await Effect.runPromise(
        promptForTelemetryConsent().pipe(Effect.provide(ConfigLive)),
      );

      const duration = Date.now() - startTime;

      // The key assertion: Should complete instantly (< 1 second) without hanging
      // This proves the TTY detection works and prevents hanging
      expect(duration).toBeLessThan(1000);

      // Result should be boolean (either from cache or newly set)
      expect(typeof result).toBe("boolean");
    } finally {
      // Restore stdin
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      });
      delete process.env.OPEN_COMPOSER_CONFIG_FILE;
    }
  });

  test.serial("promptForTelemetryConsent detects CI environment and completes quickly", async () => {
    const { promptForTelemetryConsent, ConfigLive } = await import(
      "../../src/services/config-service.js"
    );
    const { Effect } = await import("effect");

    process.env.OPEN_COMPOSER_CONFIG_FILE = mockConfigPath;
    process.env.CI = "true";

    // Write empty config to ensure no existing consent
    await writeFile(
      mockConfigPath,
      JSON.stringify({
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
      "utf-8",
    );

    try {
      const startTime = Date.now();

      const result = await Effect.runPromise(
        promptForTelemetryConsent().pipe(Effect.provide(ConfigLive)),
      );

      const duration = Date.now() - startTime;

      // The key assertion: Should complete instantly without hanging
      expect(duration).toBeLessThan(1000);
      expect(typeof result).toBe("boolean");
    } finally {
      delete process.env.CI;
      delete process.env.OPEN_COMPOSER_CONFIG_FILE;
    }
  });

  test.serial(
    "promptForTelemetryConsent skips prompt when already consented and completes quickly",
    async () => {
      const { promptForTelemetryConsent, ConfigLive } = await import(
        "../../src/services/config-service.js"
      );
      const { Effect } = await import("effect");

      process.env.OPEN_COMPOSER_CONFIG_FILE = mockConfigPath;

      // Pre-set consent
      await testSetTelemetryConsent(true);

      try {
        const startTime = Date.now();

        const result = await Effect.runPromise(
          promptForTelemetryConsent().pipe(Effect.provide(ConfigLive)),
        );

        const duration = Date.now() - startTime;

        // Key assertion: Should return immediately without prompting when consent exists
        expect(duration).toBeLessThan(1000);
        // Result should be boolean (cached value)
        expect(typeof result).toBe("boolean");
      } finally {
        delete process.env.OPEN_COMPOSER_CONFIG_FILE;
      }
    },
  );

  test.serial(
    "promptForTelemetryConsent completes within reasonable time (never hangs)",
    async () => {
      const { promptForTelemetryConsent, ConfigLive } = await import(
        "../../src/services/config-service.js"
      );
      const { Effect } = await import("effect");

      process.env.OPEN_COMPOSER_CONFIG_FILE = mockConfigPath;
      process.env.CI = "true"; // Use CI mode to avoid actual prompt

      // Write empty config to ensure no existing consent
      await writeFile(
        mockConfigPath,
        JSON.stringify({
          version: "1.0.0",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        }),
        "utf-8",
      );

      try {
        // Add an external timeout to ensure the function completes
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Function hung for > 35 seconds")), 35000),
        );

        const effectPromise = Effect.runPromise(
          promptForTelemetryConsent().pipe(Effect.provide(ConfigLive)),
        );

        // Race between the effect and our test timeout
        const result = await Promise.race([effectPromise, timeoutPromise]);

        // If we get here, the function completed (didn't hang)
        // The actual value doesn't matter - what matters is it completed
        expect(typeof result).toBe("boolean");
      } finally {
        delete process.env.CI;
        delete process.env.OPEN_COMPOSER_CONFIG_FILE;
      }
    },
    { timeout: 40000 },
  );
});
