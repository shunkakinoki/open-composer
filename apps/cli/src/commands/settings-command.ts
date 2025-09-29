import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import { SettingsService } from "../services/settings-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildSettingsCommand(): CommandBuilder<"settings"> {
  const command = () =>
    Command.make("settings").pipe(
      Command.withDescription("Manage application settings"),
      Command.withSubcommands([
        buildGetCommand(),
        buildSetCommand(),
        buildListCommand(),
        buildDeleteCommand(),
      ]),
    );

  return {
    command,
    metadata: {
      name: "settings",
      description: "Manage application settings",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

export function buildGetCommand() {
  const keyArg = Args.text({ name: "key" }).pipe(
    Args.withDescription("Setting key to retrieve"),
  );

  return Command.make("get", { key: keyArg }).pipe(
    Command.withDescription("Get a setting value"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("settings", "get");
        yield* trackFeatureUsage("settings_get", {
          key: config.key,
        });

        const settings = yield* SettingsService;
        const value = yield* settings.getSetting(config.key);

        if (value === null) {
          console.log(`❌ Setting '${config.key}' not found`);
          return undefined;
        }

        console.log(`${config.key}=${value}`);
        return undefined;
      }),
    ),
  );
}

export function buildSetCommand() {
  const keyArg = Args.text({ name: "key" }).pipe(
    Args.withDescription("Setting key to set"),
  );

  const valueArg = Args.text({ name: "value" }).pipe(
    Args.withDescription("Setting value to set"),
  );

  return Command.make("set", { key: keyArg, value: valueArg }).pipe(
    Command.withDescription("Set a setting value"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("settings", "set");
        yield* trackFeatureUsage("settings_set", {
          key: config.key,
        });

        const settings = yield* SettingsService;
        yield* settings.setSetting(config.key, config.value);

        console.log(`✅ Set ${config.key}=${config.value}`);
        return undefined;
      }),
    ),
  );
}

export function buildListCommand() {
  const jsonOption = Options.boolean("json").pipe(
    Options.withDescription("Output in JSON format"),
  );

  return Command.make("list", { json: jsonOption }).pipe(
    Command.withDescription("List all settings"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("settings", "list");
        yield* trackFeatureUsage("settings_list", {
          format: config.json ? "json" : "table",
        });

        const settings = yield* SettingsService;
        const allSettings = yield* settings.getAllSettings();

        if (allSettings.length === 0) {
          console.log("ℹ️  No settings found");
          return undefined;
        }

        if (config.json) {
          console.log(JSON.stringify(allSettings, null, 2));
        } else {
          console.log("📋 Application Settings:");
          console.log("─".repeat(60));

          // Calculate column widths for better formatting
          const maxKeyLength = Math.max(
            ...allSettings.map((s) => s.key.length),
          );
          const maxValueLength = Math.max(
            ...allSettings.map((s) => s.value.length),
            10,
          );

          console.log(
            `Key${" ".repeat(Math.max(0, maxKeyLength - 3))} | Value${" ".repeat(Math.max(0, maxValueLength - 5))} | Updated`,
          );
          console.log(
            `${"─".repeat(maxKeyLength)}-+-${"─".repeat(maxValueLength)}-+-${"─".repeat(19)}`,
          );

          for (const setting of allSettings) {
            const key = setting.key.padEnd(maxKeyLength);
            const value = setting.value.padEnd(maxValueLength);
            const updatedAt = new Date(setting.updatedAt).toLocaleString();
            console.log(`${key} | ${value} | ${updatedAt}`);
          }

          console.log(`\n📊 Total: ${allSettings.length} settings`);
        }

        return undefined;
      }),
    ),
  );
}

export function buildDeleteCommand() {
  const keyArg = Args.text({ name: "key" }).pipe(
    Args.withDescription("Setting key to delete"),
  );

  const forceOption = Options.boolean("force").pipe(
    Options.withDescription("Skip confirmation prompt"),
  );

  return Command.make("delete", { key: keyArg, force: forceOption }).pipe(
    Command.withDescription("Delete a setting"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("settings", "delete");
        yield* trackFeatureUsage("settings_delete", {
          key: config.key,
          force: config.force,
        });

        const settings = yield* SettingsService;

        // Check if setting exists first
        const exists = yield* settings.hasSetting(config.key);
        if (!exists) {
          console.log(`❌ Setting '${config.key}' not found`);
          return undefined;
        }

        // Confirm deletion unless forced
        if (!config.force) {
          const currentValue = yield* settings.getSetting(config.key);
          console.log(`⚠️  About to delete setting:`);
          console.log(`   Key: ${config.key}`);
          console.log(`   Value: ${currentValue}`);
          console.log(
            `\n❓ Are you sure? Run with --force to skip this confirmation.`,
          );
          return undefined;
        }

        const deleted = yield* settings.deleteSetting(config.key);

        if (deleted) {
          console.log(`✅ Deleted setting '${config.key}'`);
        } else {
          console.log(`❌ Failed to delete setting '${config.key}'`);
        }

        return undefined;
      }),
    ),
  );
}
