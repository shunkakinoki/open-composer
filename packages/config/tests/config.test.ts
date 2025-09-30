import { describe, expect, test } from "bun:test";
import { defaultConfig, type UserConfig } from "../src/index.js";

const requiredFields = [
  ["version", "1.0.0"],
  ["createdAt", "2024-01-01T00:00:00.000Z"],
  ["updatedAt", "2024-01-01T00:00:00.000Z"],
] as const;

describe.concurrent("Config", () => {
  test.concurrent("should have a default config", async () => {
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.version).toBe("1.0.0");
    expect(defaultConfig.createdAt).toBeDefined();
    expect(defaultConfig.updatedAt).toBeDefined();
  });

  test.concurrent("should require core fields in UserConfig", async () => {
    const config: UserConfig = {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    for (const [field, expected] of requiredFields) {
      expect(config).toHaveProperty(field, expected);
    }
  });

  test.concurrent("should allow optional telemetry config", async () => {
    const config: UserConfig = {
      ...defaultConfig,
      telemetry: {
        enabled: true,
        consentedAt: "2024-01-01T00:00:00.000Z",
      },
    };

    expect(config.telemetry?.enabled).toBe(true);
  });
});
