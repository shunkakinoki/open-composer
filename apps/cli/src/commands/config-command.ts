import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { ConfigService, type UserConfig } from "../services/config-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";

// Extended config type to include cache fields that may exist
interface ExtendedUserConfig extends UserConfig {
  agentCache?: {
    agents: Array<{
      name: string;
      available: boolean;
      lastChecked: string;
    }>;
    lastUpdated: string;
  };
}

export function buildConfigCommand() {
  return Command.make("config").pipe(
    Command.withDescription("Manage application configuration"),
    Command.withSubcommands([
      buildGetCommand(),
      buildSetCommand(),
      buildShowCommand(),
      buildCacheCommand(),
    ]),
  );
}

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

export function buildCacheCommand() {
  return Command.make("cache").pipe(
    Command.withDescription("Manage application caches"),
    Command.withSubcommands([
      buildCacheClearCommand(),
      buildCacheShowCommand(),
    ]),
  );
}

export function buildCacheClearCommand() {
  const typeOption = Options.text("type").pipe(
    Options.optional,
    Options.withDescription("Cache type to clear (default: all)"),
  );

  return Command.make("clear", { type: typeOption }).pipe(
    Command.withDescription("Clear application caches"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("config", "cache-clear");
        yield* trackFeatureUsage("config_cache_clear", {
          has_type: Option.isSome(config.type),
        });

        const configService = yield* ConfigService;
        const currentConfig = yield* configService.getConfig();

        if (Option.isSome(config.type)) {
          const cacheType = config.type.value;

          // Handle specific cache types
          if (cacheType === "agent" || cacheType === "all") {
            // Remove agentCache if it exists
            const updatedConfig = { ...currentConfig };
            delete (updatedConfig as ExtendedUserConfig).agentCache;
            yield* configService.updateConfig(updatedConfig);
            console.log("✅ Cleared agent cache");
          }

          if (cacheType === "all") {
            // Clear all known cache types
            console.log("✅ Cleared all caches");
          }
        } else {
          // Clear all caches
          const updatedConfig = { ...currentConfig };
          delete (updatedConfig as ExtendedUserConfig).agentCache;
          // Add other cache clearing logic here as needed
          yield* configService.updateConfig(updatedConfig);
          console.log("✅ Cleared all application caches");
        }

        return undefined;
      }),
    ),
  );
}

export function buildCacheShowCommand() {
  return Command.make("show").pipe(
    Command.withDescription("Show cache contents and status"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("config", "cache-show");
        yield* trackFeatureUsage("config_cache_show");

        const configService = yield* ConfigService;
        const config = yield* configService.getConfig();

        console.log("🗄️  Application Cache Status:");
        console.log("─".repeat(50));

        // Check for agent cache
        const agentCache = (config as ExtendedUserConfig).agentCache;
        if (agentCache) {
          console.log("📦 Agent Cache:");
          console.log(`   Agents: ${agentCache.agents?.length || 0} cached`);
          console.log(`   Last Updated: ${agentCache.lastUpdated || "Never"}`);
          if (agentCache.agents?.length > 0) {
            console.log("   Cached agents:");
            for (const agent of agentCache.agents) {
              console.log(
                `     • ${agent.name} (${agent.available ? "available" : "unavailable"})`,
              );
            }
          }
        } else {
          console.log("📦 Agent Cache: Empty");
        }

        // Check for other cache types here as they are added

        console.log("\n💡 Use 'config cache clear' to clear caches");

        return undefined;
      }),
    ),
  );
}
