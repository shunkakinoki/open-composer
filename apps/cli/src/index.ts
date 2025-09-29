#!/usr/bin/env bun

import type { ValidationError } from "@effect/cli/ValidationError";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { initializeDatabase } from "@open-composer/db";
import * as Effect from "effect/Effect";
import { CliLive, cli } from "./lib/cli.js";
import {
  ConfigLive,
  promptForTelemetryConsent,
} from "./services/config-service.js";
import { TelemetryLive, trackException } from "./services/telemetry-service.js";

export * from "./components/ComposerApp.js";
export * from "./lib/index.js";

if (import.meta.main) {
  // Set up global error handlers for exception tracking
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Track the exception with telemetry if available (async, non-blocking)
    trackException(error, "uncaught_exception")
      .pipe(
        Effect.provide(TelemetryLive),
        Effect.provide(ConfigLive),
        Effect.runPromise,
      )
      .catch(() => {
        // Ignore telemetry errors during error handling
      });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error("Unhandled Rejection at:", promise, "reason:", error);
    // Track the exception with telemetry if available (async, non-blocking)
    trackException(error, "unhandled_rejection")
      .pipe(
        Effect.provide(TelemetryLive),
        Effect.provide(ConfigLive),
        Effect.runPromise,
      )
      .catch(() => {
        // Ignore telemetry errors during error handling
      });
    process.exit(1);
  });

  // Check if this is a config clear command
  const isConfigClear =
    process.argv.includes("config") && process.argv.includes("clear");

  const program = Effect.provide(
    initializeDatabase.pipe(
      Effect.flatMap(() =>
        cli(process.argv).pipe(
          // Prompt for telemetry consent on first run (skip for config clear)
          Effect.tap(() =>
            isConfigClear ? Effect.void : promptForTelemetryConsent(),
          ),
          Effect.flatMap(() => Effect.void), // Convert the result to void for the CLI
          // Add global error handling
          Effect.catchAll((error) => {
            // Track only actual Error instances, not ValidationError
            const trackEffect =
              error instanceof Error
                ? trackException(error, "cli_execution_error")
                : Effect.void;

            return trackEffect.pipe(
              Effect.provide(TelemetryLive),
              Effect.provide(ConfigLive),
              Effect.flatMap(() => Effect.fail(error)),
            );
          }),
        ),
      ),
    ),
    CliLive,
  );

  const runnable = program as Effect.Effect<
    void,
    Error | ValidationError,
    never
  >;

  BunRuntime.runMain(runnable, {
    disableErrorReporting: true,
  });
}
