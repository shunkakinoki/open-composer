import { randomUUID } from "node:crypto";
import { Context, Effect, Layer } from "effect";
import { PostHog } from "posthog-node";
import { CLI_VERSION } from "../lib/version.js";
import type { TelemetryConfig } from "./config.js";
import { ConfigService } from "./config.js";

// Get or create a persistent anonymous user ID using the config system
function getOrCreateAnonymousId(): Effect.Effect<string, never, ConfigService> {
  return Effect.gen(function* (_) {
    const configService = yield* _(ConfigService);
    const config = yield* _(configService.getConfig());
    const telemetry = config.telemetry;

    // Check if we already have an anonymous ID in the config
    if (telemetry?.anonymousId) {
      return telemetry.anonymousId;
    }

    // Generate a new unique ID
    const newId = randomUUID();

    // Update config with the new anonymous ID while preserving existing fields
    const updatedTelemetry: TelemetryConfig = {
      enabled: telemetry?.enabled ?? false,
      apiKey: telemetry?.apiKey,
      host: telemetry?.host,
      distinctId: telemetry?.distinctId,
      consentedAt: telemetry?.consentedAt,
      version: telemetry?.version,
      anonymousId: newId,
    };

    yield* _(
      configService.updateConfig({
        telemetry: updatedTelemetry,
      }),
    );

    return newId;
  });
}
// Default telemetry configuration
const defaultConfig: TelemetryConfig = {
  enabled: false, // Disable telemetry by default - enable via environment variable
  apiKey:
    process.env.OPEN_COMPOSER_POSTHOG_API_KEY ||
    "phc_myz44Az2Eim07Kk1aP3jWLVb2pzn75QWVDhOMv9dSsU",
  host: process.env.OPEN_COMPOSER_POSTHOG_HOST || "https://us.i.posthog.com",
  distinctId: undefined,
};

// Create the PostHog client
function createPostHogClient(config: TelemetryConfig) {
  if (!config.enabled || !config.apiKey) {
    return null;
  }

  return new PostHog(config.apiKey, {
    host: config.host,
    requestTimeout: 10000, // 10 seconds timeout
    maxCacheSize: 1000,
    flushAt: 1, // Flush immediately for CLI usage
    flushInterval: 0, // Disable periodic flushing
    enableExceptionAutocapture: true, // Enable automatic exception tracking
  });
}

// Telemetry service interface
export interface TelemetryService {
  readonly track: (
    event: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => Effect.Effect<void, never, never>;
  readonly identify: (
    distinctId: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => Effect.Effect<void, never, never>;
  readonly capture: (
    event: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => Effect.Effect<void, never, never>;
  readonly captureException: (
    error: Error,
    distinctId?: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => Effect.Effect<void, never, never>;
  readonly flush: () => Effect.Effect<void, never, never>;
  readonly shutdown: () => Effect.Effect<void, never, never>;
}

// Telemetry service tag
export const TelemetryService = Context.GenericTag<TelemetryService>(
  "@open-composer/telemetry/TelemetryService",
);

// Create telemetry service implementation
const createTelemetryService = (config: TelemetryConfig): TelemetryService => {
  const client = createPostHogClient(config);

  return {
    track: (
      event: string,
      properties?: Record<string, string | number | boolean | null | undefined>,
    ) =>
      client
        ? Effect.try(() => {
            client.capture({
              distinctId: config.distinctId || "anonymous",
              event,
              properties: {
                ...properties,
                version: CLI_VERSION,
                source: "cli",
              },
            });
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,

    identify: (
      distinctId: string,
      properties?: Record<string, string | number | boolean | null | undefined>,
    ) =>
      client
        ? Effect.try(() => {
            client.identify({
              distinctId,
              properties: {
                ...properties,
                version: CLI_VERSION,
                source: "cli",
              },
            });
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,

    capture: (
      event: string,
      properties?: Record<string, string | number | boolean | null | undefined>,
    ) =>
      client
        ? Effect.try(() => {
            client.capture({
              distinctId: config.distinctId || "anonymous",
              event,
              properties: {
                ...properties,
                version: CLI_VERSION,
                source: "cli",
              },
            });
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,

    captureException: (
      error: Error,
      distinctId?: string,
      properties?: Record<string, string | number | boolean | null | undefined>,
    ) =>
      client
        ? Effect.try(() => {
            client.captureException(
              error,
              distinctId || config.distinctId || "anonymous",
              {
                ...properties,
                version: CLI_VERSION,
                source: "cli",
              },
            );
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,

    flush: () =>
      client
        ? Effect.try(() => {
            client.flush();
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,

    shutdown: () =>
      client
        ? Effect.try(() => {
            client.shutdown();
          }).pipe(Effect.catchAll(() => Effect.void))
        : Effect.void,
  };
};

// Create telemetry layer
export const TelemetryLive = Layer.effect(
  TelemetryService,
  getOrCreateAnonymousId().pipe(
    Effect.map((anonymousId) =>
      createTelemetryService({
        enabled:
          process.env.OPEN_COMPOSER_TELEMETRY === "true" ||
          defaultConfig.enabled,
        apiKey:
          process.env.OPEN_COMPOSER_POSTHOG_API_KEY || defaultConfig.apiKey,
        host: process.env.OPEN_COMPOSER_POSTHOG_HOST || defaultConfig.host,
        distinctId: process.env.OPEN_COMPOSER_DISTINCT_ID || anonymousId,
      }),
    ),
  ),
);

// Helper functions for common telemetry events
export const trackCommand = (command: string, subcommand?: string) =>
  TelemetryService.pipe(
    Effect.flatMap((telemetry) =>
      telemetry.track("cli_command_executed", {
        command,
        subcommand,
        timestamp: new Date().toISOString(),
      }),
    ),
  );

export const trackError = (error: string, command?: string) =>
  TelemetryService.pipe(
    Effect.flatMap((telemetry) =>
      telemetry.track("cli_error_occurred", {
        error,
        command,
        timestamp: new Date().toISOString(),
      }),
    ),
  );

export const trackFeatureUsage = (
  feature: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
) =>
  TelemetryService.pipe(
    Effect.flatMap((telemetry) =>
      telemetry.track("cli_feature_used", {
        feature,
        ...metadata,
        timestamp: new Date().toISOString(),
      }),
    ),
  );

export const trackException = (error: Error, command?: string) =>
  TelemetryService.pipe(
    Effect.flatMap((telemetry) =>
      telemetry.captureException(error, undefined, {
        command,
        timestamp: new Date().toISOString(),
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
      }),
    ),
  );
