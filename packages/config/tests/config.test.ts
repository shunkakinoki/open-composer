import { describe, expect, it } from "bun:test";
import { defaultConfig, type UserConfig } from "../src/index.js";

describe("Config", () => {
  it("should have a default config", () => {
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.version).toBe("1.0.0");
    expect(defaultConfig.createdAt).toBeDefined();
    expect(defaultConfig.updatedAt).toBeDefined();
  });

  it("should have required fields in UserConfig", () => {
    const config: UserConfig = {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(config.version).toBe("1.0.0");
    expect(config.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(config.updatedAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should allow optional telemetry config", () => {
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
