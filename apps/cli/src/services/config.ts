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
export interface ConfigServiceInterface {
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
export const ConfigService = Context.GenericTag<ConfigServiceInterface>(
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
const createConfigService = (): ConfigServiceInterface => {
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
            consentedAt: enabled
              ? new Date().toISOString()
              : currentConfig.telemetry?.consentedAt,
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
export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.succeed(createConfigService()),
);

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

    // If telemetry consent has already been given, no need to prompt
    if (config.telemetry?.consentedAt) {
      return config.telemetry.enabled;
    }

    // Check if we're in a CI environment
    const isCI =
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS;

    if (isCI) {
      // Non-interactive environment, default to false
      yield* _(configService.setTelemetryConsent(false));
      return false;
    }

    return yield* _(
      Effect.tryPromise({
        try: async () => {
          const { render } = await import("ink");
          const React = await import("react");
          const { TelemetryConsentPrompt } = await import(
            "../components/TelemetryConsentPrompt.js"
          );

          return new Promise<boolean>((resolve, reject) => {
            try {
              const { waitUntilExit } = render(
                React.createElement(TelemetryConsentPrompt, {
                  onConsent: (consent: boolean) => {
                    // Ensure consent is recorded before resolving
                    configService
                      .setTelemetryConsent(consent)
                      .pipe(Effect.runPromise)
                      .then(() => {
                        resolve(consent);
                      })
                      .catch((error) => {
                        console.error("Failed to save consent:", error);
                        resolve(false);
                      });
                  },
                  onCancel: () => {
                    // Ensure consent is recorded as false when cancelled
                    configService
                      .setTelemetryConsent(false)
                      .pipe(Effect.runPromise)
                      .then(() => {
                        resolve(false);
                      })
                      .catch((error) => {
                        console.error("Failed to save consent:", error);
                        resolve(false);
                      });
                  },
                }),
              );

              waitUntilExit()
                .then(() => {
                  // If we reach here without resolving, ensure consent is recorded as false
                  configService
                    .setTelemetryConsent(false)
                    .pipe(Effect.runPromise)
                    .then(() => {
                      resolve(false);
                    })
                    .catch(() => {
                      resolve(false);
                    });
                })
                .catch((error) => {
                  console.error("waitUntilExit error:", error);
                  configService
                    .setTelemetryConsent(false)
                    .pipe(Effect.runPromise)
                    .then(() => {
                      resolve(false);
                    })
                    .catch(() => {
                      resolve(false);
                    });
                });
            } catch (error) {
              reject(error);
            }
          });
        },
        catch: (_) => {
          // If Ink fails for any reason, fall back to setting consent to false
          return configService
            .setTelemetryConsent(false)
            .pipe(Effect.map(() => false));
        },
      }),
    );
  });
