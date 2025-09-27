#!/usr/bin/env bun

import type { ValidationError } from "@effect/cli/ValidationError";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Effect from "effect/Effect";
import { CliLive, cli } from "./lib/cli.js";
import { promptForTelemetryConsent } from "./services/config.js";

export * from "./components/ComposerApp.js";
export * from "./lib/index.js";

if (require.main === module) {
  const program = Effect.provide(
    cli(process.argv).pipe(
      // Prompt for telemetry consent on first run
      Effect.tap(() => promptForTelemetryConsent()),
      Effect.flatMap(() => Effect.void), // Convert the result to void for the CLI
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
