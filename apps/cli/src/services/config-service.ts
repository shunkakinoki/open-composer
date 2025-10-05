import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  ConfigService as ConfigServiceTag,
  defaultConfig,
  type UserConfig,
} from "@open-composer/config";
import { Effect, Layer } from "effect";

// Config service interface (extending the shared interface)
export interface ConfigServiceInterface {
  readonly getConfig: () => Effect.Effect<UserConfig, never, never>;
  readonly updateConfig: (
    updates: Partial<UserConfig>,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly clearConfig: () => Effect.Effect<UserConfig, never, never>;
  readonly setTelemetryConsent: (
    enabled: boolean,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly getTelemetryConsent: () => Effect.Effect<boolean, never, never>;
}

// Config service tag (using the shared one)
export const ConfigService = ConfigServiceTag;

// Get config directory path
function getConfigDir(): string {
  // Use temp directory during testing to avoid conflicts
  if (process.env.BUN_TEST) {
    const { tmpdir } = require("node:os");
    const { join } = require("node:path");
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return join(tmpdir(), `open-composer-test-config-${testId}`);
  }
  const home = homedir();
  return join(home, ".config", "open-composer");
}

// Get config file path
function getConfigPath(): string {
  const dir = getConfigDir();
  // Ensure directory exists
  require("node:fs").mkdirSync(dir, { recursive: true });
  return join(dir, "config.json");
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

    clearConfig: () =>
      Effect.promise(async () => {
        const configPath = getConfigPath();

        // Delete the config file entirely to reset to true default state
        try {
          await rm(configPath, { force: true });
        } catch {
          // Ignore if file doesn't exist
        }

        // Return the default config (what getConfig will return when file is missing)
        return defaultConfig;
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
export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.succeed(createConfigService()),
);

export const promptForTelemetryConsent = () =>
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigService);
    const config = yield* _(configService.getConfig());

    // If telemetry consent has already been given, no need to prompt
    if (config.telemetry?.consentedAt) {
      return config.telemetry.enabled;
    }

    // Check if we're in a test or CI environment
    const isTestMode =
      process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1";
    const isCI =
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS;

    // Check if stdin is a TTY (interactive terminal)
    // When running via `curl | bash` or in non-interactive contexts, this will be false
    const isInteractive = process.stdin.isTTY === true;

    if (isTestMode || isCI || !isInteractive) {
      // Non-interactive environment, default to false without prompting
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
            let resolved = false;

            // Failsafe timeout: if the prompt doesn't respond within 30 seconds, auto-resolve to false
            const timeoutId = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                console.warn(
                  "Telemetry consent prompt timed out, defaulting to disabled",
                );
                configService
                  .setTelemetryConsent(false)
                  .pipe(Effect.runPromise)
                  .then(() => resolve(false))
                  .catch(() => resolve(false));
              }
            }, 30000);

            try {
              const { waitUntilExit } = render(
                React.createElement(TelemetryConsentPrompt, {
                  onConsent: (consent: boolean) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeoutId);
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
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeoutId);
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
                  if (resolved) return;
                  resolved = true;
                  clearTimeout(timeoutId);
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
                  if (resolved) return;
                  resolved = true;
                  clearTimeout(timeoutId);
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
              if (resolved) return;
              resolved = true;
              clearTimeout(timeoutId);
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
