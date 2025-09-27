import { Context, Effect, Layer } from "effect";
import { PostHog } from "posthog-node";
import { CLI_VERSION } from "../lib/version.js";

// Telemetry configuration interface
export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly host?: string;
  readonly distinctId?: string;
}

// Default telemetry configuration
const defaultConfig: TelemetryConfig = {
  enabled: false, // Opt-in by default
  apiKey: "phc_your_api_key_here", // This should be set via environment variable
  host: "https://posthog-worker.shunkakinoki.workers.dev",
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
    // Get configuration from environment variables
    const telemetryEnabled = process.env.OPEN_COMPOSER_TELEMETRY === "true";
    const apiKey = process.env.OPEN_COMPOSER_POSTHOG_API_KEY;
    const host = process.env.OPEN_COMPOSER_POSTHOG_HOST || defaultConfig.host;
    const distinctId = process.env.OPEN_COMPOSER_DISTINCT_ID;

    const config: TelemetryConfig = {
      enabled: telemetryEnabled,
      apiKey,
      host,
      distinctId,
    };

    // If telemetry is not explicitly enabled, create a no-op service
    if (!config.enabled) {
      return {
        track: () => Effect.void,
        identify: () => Effect.void,
        capture: () => Effect.void,
        flush: () => Effect.void,
        shutdown: () => Effect.void,
      };
    }

    // If API key is not provided, create a no-op service
    if (!config.apiKey) {
      console.warn(
        "Telemetry enabled but no API key provided. Set OPEN_COMPOSER_POSTHOG_API_KEY environment variable.",
      );
      return {
        track: () => Effect.void,
        identify: () => Effect.void,
        capture: () => Effect.void,
        flush: () => Effect.void,
        shutdown: () => Effect.void,
      };
    }

    return createTelemetryService(config);
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
