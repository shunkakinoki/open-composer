import { randomUUID } from "node:crypto";
import type { TelemetryConfig } from "@open-composer/config";
import { Context, Effect, Layer } from "effect";
import { PostHog } from "posthog-node";
import { CLI_VERSION } from "../lib/version.js";
import type { ConfigServiceInterface } from "./config-service.js";
import { ConfigService } from "./config-service.js";

// Get or create a persistent anonymous user ID using the config system
function getOrCreateAnonymousId(): Effect.Effect<
  string,
  never,
  ConfigServiceInterface
> {
  return Effect.gen(function* (_) {
    const configService = yield* _(ConfigService);
    const config = yield* _(configService.getConfig());
    const telemetry = config.telemetry;

    // Check if we already have an anonymous ID in the config
    if (telemetry?.anonymousId) {
      return telemetry.anonymousId;
    }

    // If no telemetry config exists or no consent given, return a temporary ID
    if (!telemetry?.consentedAt) {
      return "anonymous"; // Temporary anonymous ID until consent is given
    }

    // Generate a new unique ID only after consent is given
    const newId = randomUUID();

    // Update config with the new anonymous ID while preserving existing fields
    const updatedTelemetry: TelemetryConfig = {
      enabled: telemetry?.enabled ?? false,
      version: telemetry?.version ?? "1.0.0",
      anonymousId: newId,
      ...(telemetry?.apiKey && { apiKey: telemetry.apiKey }),
      ...(telemetry?.host && { host: telemetry.host }),
      ...(telemetry?.distinctId && { distinctId: telemetry.distinctId }),
      ...(telemetry?.consentedAt && { consentedAt: telemetry.consentedAt }),
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
  host: "https://posthog-worker.shunkakinoki.workers.dev",
};

// Create the PostHog client
function createPostHogClient(config: TelemetryConfig) {
  if (!config.enabled || !config.apiKey) {
    return null;
  }

  return new PostHog(config.apiKey, {
    ...(config.host && { host: config.host }),
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
            if (process.env.DEBUG_TELEMETRY) {
              console.log("Tracking event:", event, "properties:", properties);
            }
            client.capture({
              distinctId: config.distinctId || "anonymous",
              event,
              properties: {
                ...properties,
                version: CLI_VERSION,
                source: "cli",
              },
            });
          }).pipe(
            Effect.catchAll((error) => {
              if (process.env.DEBUG_TELEMETRY) {
                console.log("Telemetry track error:", error);
              }
              return Effect.void;
            }),
          )
        : Effect.sync(() => {
            if (process.env.DEBUG_TELEMETRY) {
              console.log("Telemetry disabled - not tracking:", event);
            }
          }),

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
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigService);
    const config = yield* _(configService.getConfig());
    const anonymousId = yield* _(getOrCreateAnonymousId());

    // Check telemetry enabled status from config, environment, or default
    const enabled = config.telemetry?.enabled || defaultConfig.enabled;

    const telemetryConfig = {
      enabled,
      apiKey: "dummy-key-for-worker",
      host: defaultConfig.host,
      distinctId: anonymousId,
    };

    // Debug logging
    if (process.env.DEBUG_TELEMETRY) {
      console.log("Telemetry config:", {
        enabled: telemetryConfig.enabled,
        hasApiKey: !!telemetryConfig.apiKey,
        host: telemetryConfig.host,
        distinctId: `${telemetryConfig.distinctId?.slice(0, 8)}...`,
      });
    }

    return createTelemetryService(telemetryConfig);
  }),
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
