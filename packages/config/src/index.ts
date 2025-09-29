import * as Context from "effect/Context";
import * as Effect from "effect/Effect";

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
export const defaultConfig: UserConfig = {
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
  readonly clearConfig: () => Effect.Effect<UserConfig, never, never>;
  readonly setTelemetryConsent: (
    enabled: boolean,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly getTelemetryConsent: () => Effect.Effect<boolean, never, never>;
}

// Config service tag
export const ConfigService = Context.GenericTag<ConfigServiceInterface>(
  "@open-composer/config/ConfigService",
);

// Helper functions for common operations
export const getTelemetryConsent = () =>
  ConfigService.pipe(Effect.flatMap((config) => config.getTelemetryConsent()));

export const setTelemetryConsent = (enabled: boolean) =>
  ConfigService.pipe(
    Effect.flatMap((config) => config.setTelemetryConsent(enabled)),
  );
