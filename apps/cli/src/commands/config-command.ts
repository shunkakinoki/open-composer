import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { ConfigService } from "../services/config-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildConfigCommand(): CommandBuilder<"config"> {
  const command = () =>
    Command.make("config").pipe(
      Command.withDescription("Manage application configuration"),
      Command.withSubcommands([
        buildGetCommand(),
        buildSetCommand(),
        buildShowCommand(),
        buildClearCommand(),
      ]),
    );

  return {
    command,
    metadata: {
      name: "config",
      description: "Manage application configuration",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

export function buildGetCommand() {
  const keyOption = Options.text("key").pipe(
    Options.optional,
    Options.withDescription("Specific config key to retrieve"),
  );

  return Command.make("get", { key: keyOption }).pipe(
    Command.withDescription("Get configuration values"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("config", "get");
        yield* trackFeatureUsage("config_get", {
          has_key: Option.isSome(config.key),
        });

        const configService = yield* ConfigService;
        const fullConfig = yield* configService.getConfig();

        if (Option.isSome(config.key)) {
          // Get specific key - safely access the config object
          const key = config.key.value;
          const value = (fullConfig as unknown as Record<string, unknown>)[key];
          if (value === undefined) {
            console.log(`❌ Config key '${key}' not found`);
            return undefined;
          }
          console.log(`${key}=${JSON.stringify(value, null, 2)}`);
        } else {
          // Show all config
          console.log(JSON.stringify(fullConfig, null, 2));
        }

        return undefined;
      }),
    ),
  );
}

export function buildSetCommand() {
  const keyArg = Options.text("key").pipe(
    Options.withDescription("Configuration key to set"),
  );

  const valueArg = Options.text("value").pipe(
    Options.withDescription("Configuration value to set (JSON string)"),
  );

  return Command.make("set", { key: keyArg, value: valueArg }).pipe(
    Command.withDescription("Set a configuration value"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("config", "set");
        yield* trackFeatureUsage("config_set", {
          key: config.key,
        });

        const configService = yield* ConfigService;

        // Parse the value as JSON
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(config.value);
        } catch {
          console.log(`❌ Invalid JSON value: ${config.value}`);
          return undefined;
        }

        // Update the config
        const updates = { [config.key]: parsedValue };
        yield* configService.updateConfig(updates);

        console.log(`✅ Set ${config.key}=${JSON.stringify(parsedValue)}`);
        return undefined;
      }),
    ),
  );
}

export function buildShowCommand() {
  return Command.make("show").pipe(
    Command.withDescription("Show current configuration"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("config", "show");
        yield* trackFeatureUsage("config_show");

        const configService = yield* ConfigService;
        const config = yield* configService.getConfig();

        console.log("📋 Current Configuration:");
        console.log("─".repeat(60));
        console.log(JSON.stringify(config, null, 2));

        return undefined;
      }),
    ),
  );
}

export function buildClearCommand() {
  return Command.make("clear").pipe(
    Command.withDescription("Clear all configuration"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("config", "clear");
        yield* trackFeatureUsage("config_clear");

        const configService = yield* ConfigService;

        // Clear all configuration by resetting to default
        yield* configService.clearConfig();

        console.log("✅ Cleared all configuration");
        console.log("💡 Use 'config set' to add new configuration values");

        return undefined;
      }),
    ),
  );
}
