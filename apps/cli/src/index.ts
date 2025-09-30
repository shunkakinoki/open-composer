#!/usr/bin/env bun

import {
  isValidationError,
  type ValidationError,
} from "@effect/cli/ValidationError";
import { initializeDatabase } from "@open-composer/db";
import * as Effect from "effect/Effect";
import { CliLive, cli } from "./lib/cli.js";
import {
  ConfigLive,
  promptForTelemetryConsent,
} from "./services/config-service.js";
import { TelemetryLive, trackException } from "./services/telemetry-service.js";

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export * from "./components/ComposerApp.js";
export * from "./lib/index.js";

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

if (import.meta.main) {
  // -----------------------------------------------------------------------------
  // Global Error Handlers
  // -----------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------------
  // Program
  // -----------------------------------------------------------------------------

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

  Effect.runPromise(runnable)
    .then(() => process.exit(0))
    .catch((error) => {
      // For ValidationError (CLI argument errors), just exit with code 1
      // For other errors, print and exit with code 1
      if (!isValidationError(error)) {
        console.error("CLI Error:", error.message || error);
      }
      process.exit(1);
    });
}
