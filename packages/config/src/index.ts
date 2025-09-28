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

// Agent availability cache interface
export interface AgentCache {
  readonly agents: ReadonlyArray<{
    readonly name: string;
    readonly available: boolean;
    readonly lastChecked: string;
  }>;
  readonly lastUpdated: string;
}

// Configuration interface
export interface UserConfig {
  readonly telemetry?: TelemetryConfig;
  readonly agentCache?: AgentCache;
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
  readonly setTelemetryConsent: (
    enabled: boolean,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly getTelemetryConsent: () => Effect.Effect<boolean, never, never>;
  readonly getAgentCache: () => Effect.Effect<
    AgentCache | undefined,
    never,
    never
  >;
  readonly updateAgentCache: (
    cache: AgentCache,
  ) => Effect.Effect<UserConfig, never, never>;
  readonly clearAgentCache: () => Effect.Effect<UserConfig, never, never>;
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

export const getAgentCache = () =>
  ConfigService.pipe(Effect.flatMap((config) => config.getAgentCache()));

export const updateAgentCache = (cache: AgentCache) =>
  ConfigService.pipe(
    Effect.flatMap((config) => config.updateAgentCache(cache)),
  );

export const clearAgentCache = () =>
  ConfigService.pipe(Effect.flatMap((config) => config.clearAgentCache()));
