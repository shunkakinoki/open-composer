import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Context, Effect, Layer } from "effect";

// Telemetry configuration interface
export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly host?: string;
  readonly distinctId?: string;
  readonly consentedAt?: string;
  readonly version?: string;
  readonly anonymousId?: string;
}

// Configuration interface
export interface UserConfig {
  readonly telemetry?: TelemetryConfig;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Default configuration
const defaultConfig: UserConfig = {
  version: "1.0.0",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Config service interface
export interface ConfigService {
  readonly getConfig: () => Effect.Effect<UserConfig, never, never>;
  readonly updateConfig: (
    updates: Partial<UserConfig>,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly setTelemetryConsent: (
    enabled: boolean,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly getTelemetryConsent: () => Effect.Effect<boolean, never, never>;
}

// Config service tag
export const ConfigService = Context.GenericTag<ConfigService>(
  "@open-composer/config/ConfigService",
);

// Get config directory path
function getConfigDir(): string {
  const home = homedir();
  return join(home, ".config", "open-composer");
}

// Get config file path
function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

// Create config service implementation
const createConfigService = (): ConfigService => {
  return {
    getConfig: () =>
      Effect.promise(async () => {
        const configPath = getConfigPath();

        try {
          const content = await readFile(configPath, "utf-8");
          const config = JSON.parse(content) as UserConfig;

          // Validate and migrate config if needed
          return {
            ...config,
            updatedAt: new Date().toISOString(),
          };
        } catch (_) {
          // If file doesn't exist or is invalid, return default config
          return defaultConfig;
        }
      }),

    updateConfig: (updates: Partial<UserConfig>) =>
      Effect.promise(async () => {
        const configPath = getConfigPath();

        let currentConfig: UserConfig;
        try {
          const content = await readFile(configPath, "utf-8");
          currentConfig = JSON.parse(content) as UserConfig;
        } catch {
          currentConfig = defaultConfig;
        }

        const updatedConfig: UserConfig = {
          ...currentConfig,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Ensure config directory exists
        await mkdir(getConfigDir(), { recursive: true });

        // Write config file
        await writeFile(
          getConfigPath(),
          JSON.stringify(updatedConfig, null, 2),
          "utf-8",
        );

        return updatedConfig;
      }),

    setTelemetryConsent: (enabled: boolean) =>
      Effect.promise(async () => {
        const configPath = getConfigPath();

        let currentConfig: UserConfig;
        try {
          const content = await readFile(configPath, "utf-8");
          currentConfig = JSON.parse(content) as UserConfig;
        } catch {
          currentConfig = defaultConfig;
        }

        const updatedConfig: UserConfig = {
          ...currentConfig,
          telemetry: {
            enabled,
            consentedAt: new Date().toISOString(),
            version: "1.0.0",
          },
          updatedAt: new Date().toISOString(),
        };

        // Ensure config directory exists
        await mkdir(getConfigDir(), { recursive: true });

        // Write config file
        await writeFile(
          getConfigPath(),
          JSON.stringify(updatedConfig, null, 2),
          "utf-8",
        );

        return updatedConfig;
      }),

    getTelemetryConsent: () =>
      Effect.promise(async () => {
        const configPath = getConfigPath();

        try {
          const content = await readFile(configPath, "utf-8");
          const config = JSON.parse(content) as UserConfig;
          return config.telemetry?.enabled ?? false;
        } catch {
          return false;
        }
      }),
  };
};

// Create config layer
export const ConfigLive = Layer.succeed(ConfigService, createConfigService());

// Helper functions for common operations
export const getTelemetryConsent = () =>
  ConfigService.pipe(Effect.flatMap((config) => config.getTelemetryConsent()));

export const setTelemetryConsent = (enabled: boolean) =>
  ConfigService.pipe(
    Effect.flatMap((config) => config.setTelemetryConsent(enabled)),
  );

export const promptForTelemetryConsent = () =>
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigService);
    const config = yield* _(configService.getConfig());

    // If telemetry is already configured, no need to prompt
    if (config.telemetry && typeof config.telemetry.enabled === "boolean") {
      return config.telemetry.enabled;
    }

    // Check if readline is available (for CLI interaction)
    const hasReadline = process?.stdin;

    if (!hasReadline) {
      // Non-interactive environment, default to false
      yield* _(configService.setTelemetryConsent(false));
      return false;
    }

    // This is a first run, show privacy notice
    console.log("\n🔒 Welcome to Open Composer!");
    console.log(
      "Open Composer respects your privacy and is committed to protecting your data.",
    );
    console.log("");
    console.log("📊 Telemetry Collection (Optional)");
    console.log(
      "   We can collect anonymous usage statistics to help improve Open Composer.",
    );
    console.log(
      "   This includes command usage, error reports, and performance metrics.",
    );
    console.log(
      "   All data is anonymized and cannot be used to identify you.",
    );
    console.log("");
    console.log("   To enable telemetry:   open-composer telemetry enable");
    console.log("   To disable telemetry: open-composer telemetry disable");
    console.log("   To view status:       open-composer telemetry status");
    console.log("");

    // Set default consent to false (privacy-first)
    yield* _(configService.setTelemetryConsent(false));
    return false;
  });
