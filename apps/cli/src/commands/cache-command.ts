import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import { CacheService } from "../services/cache-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";

export function buildCacheCommand() {
  return Command.make("cache").pipe(
    Command.withDescription("Manage application cache"),
    Command.withSubcommands([
      buildListCommand(),
      buildClearCommand(),
      buildStatusCommand(),
    ]),
  );
}

export function buildListCommand() {
  const jsonOption = Options.boolean("json").pipe(
    Options.withDescription("Output in JSON format"),
  );

  return Command.make("list", { json: jsonOption }).pipe(
    Command.withDescription("List cached agent information"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("cache", "list");
        yield* trackFeatureUsage("cache_list", {
          format: config.json ? "json" : "table",
        });

        const cache = yield* CacheService;
        const agentCache = yield* cache.getAgentCache();

        if (!agentCache || agentCache.agents.length === 0) {
          console.log("ℹ️  No cached agent information found");
          return undefined;
        }

        if (config.json) {
          console.log(JSON.stringify(agentCache, null, 2));
        } else {
          console.log("📋 Cached Agent Information:");
          console.log("─".repeat(80));

          // Calculate column widths for better formatting
          const maxNameLength = Math.max(
            ...agentCache.agents.map((agent) => agent.name.length),
            4, // "Name"
          );
          const maxStatusLength = Math.max(
            ...agentCache.agents
              .map((agent) => (agent.available ? "Available" : "Unavailable"))
              .map((status) => status.length),
            6, // "Status"
          );

          console.log(
            `Name${" ".repeat(Math.max(0, maxNameLength - 4))} | Status${" ".repeat(Math.max(0, maxStatusLength - 6))} | Last Checked`,
          );
          console.log(
            `${"─".repeat(maxNameLength)}-+-${"─".repeat(maxStatusLength)}-+-${"─".repeat(19)}`,
          );

          for (const agent of agentCache.agents) {
            const name = agent.name.padEnd(maxNameLength);
            const status = (
              agent.available ? "Available" : "Unavailable"
            ).padEnd(maxStatusLength);
            const lastChecked = new Date(agent.lastChecked).toLocaleString();
            console.log(`${name} | ${status} | ${lastChecked}`);
          }

          console.log(`\n📊 Total: ${agentCache.agents.length} agents cached`);
          console.log(
            `🕐 Last updated: ${new Date(agentCache.lastUpdated).toLocaleString()}`,
          );
        }

        return undefined;
      }),
    ),
  );
}

export function buildClearCommand() {
  const forceOption = Options.boolean("force").pipe(
    Options.withDescription("Skip confirmation prompt"),
  );

  return Command.make("clear", { force: forceOption }).pipe(
    Command.withDescription("Clear all cached agent information"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("cache", "clear");
        yield* trackFeatureUsage("cache_clear", {
          force: config.force,
        });

        const cache = yield* CacheService;

        // Check if cache exists first
        const agentCache = yield* cache.getAgentCache();
        if (!agentCache || agentCache.agents.length === 0) {
          console.log("ℹ️  No cached data to clear");
          return undefined;
        }

        // Confirm deletion unless forced
        if (!config.force) {
          console.log(
            `⚠️  About to clear cache containing ${agentCache.agents.length} agents`,
          );
          console.log(
            `🕐 Last updated: ${new Date(agentCache.lastUpdated).toLocaleString()}`,
          );
          console.log(
            `\n❓ Are you sure? Run with --force to skip this confirmation.`,
          );
          return undefined;
        }

        yield* cache.clearAgentCache();

        console.log("✅ Cache cleared successfully");
        return undefined;
      }),
    ),
  );
}

export function buildStatusCommand() {
  const jsonOption = Options.boolean("json").pipe(
    Options.withDescription("Output in JSON format"),
  );

  return Command.make("status", { json: jsonOption }).pipe(
    Command.withDescription("Show cache status and information"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("cache", "status");
        yield* trackFeatureUsage("cache_status", {
          format: config.json ? "json" : "text",
        });

        const cache = yield* CacheService;
        const agentCache = yield* cache.getAgentCache();

        const status = {
          hasCache: !!agentCache,
          agentCount: agentCache?.agents.length ?? 0,
          lastUpdated: agentCache?.lastUpdated ?? null,
          cacheLocation: "~/.config/open-composer/cache.json",
        };

        if (config.json) {
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log("📊 Cache Status:");
          console.log("─".repeat(40));
          console.log(`Cache exists: ${status.hasCache ? "✅ Yes" : "❌ No"}`);
          console.log(`Agents cached: ${status.agentCount}`);
          console.log(`Location: ${status.cacheLocation}`);

          if (status.lastUpdated) {
            console.log(
              `Last updated: ${new Date(status.lastUpdated).toLocaleString()}`,
            );
          } else {
            console.log("Last updated: Never");
          }
        }

        return undefined;
      }),
    ),
  );
}
