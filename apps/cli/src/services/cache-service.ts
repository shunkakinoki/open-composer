import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type AgentCache,
  type CacheServiceInterface,
  CacheService as CacheServiceTag,
} from "@open-composer/cache";
import { Effect, Layer } from "effect";

// Re-export types for convenience
export type { AgentCache, CacheServiceInterface } from "@open-composer/cache";

// Cache service tag (using the shared one)
export const CacheService = CacheServiceTag;

// Get cache directory path (same as config directory)
function getCacheDir(): string {
  // Use temp directory during testing to avoid conflicts
  if (process.env.BUN_TEST) {
    const { tmpdir } = require("node:os");
    const { join } = require("node:path");
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return join(tmpdir(), `open-composer-test-cache-${testId}`);
  }
  const home = homedir();
  return join(home, ".config", "open-composer");
}

// Get cache file path
function getCachePath(): string {
  return join(getCacheDir(), "cache.json");
}

// Create cache service implementation
const createCacheService = (): CacheServiceInterface => ({
  getAgentCache: () =>
    Effect.promise(async () => {
      const cachePath = getCachePath();

      try {
        const content = await readFile(cachePath, "utf-8");
        const cache = JSON.parse(content) as AgentCache;
        return cache;
      } catch {
        return undefined;
      }
    }),

  updateAgentCache: (cache: AgentCache) =>
    Effect.promise(async () => {
      const cachePath = getCachePath();

      // Ensure cache directory exists
      await mkdir(getCacheDir(), { recursive: true });

      // Write cache file
      await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
    }),

  clearAgentCache: () =>
    Effect.promise(async () => {
      const cachePath = getCachePath();

      try {
        await writeFile(
          cachePath,
          JSON.stringify(
            { agents: [], lastUpdated: new Date().toISOString() },
            null,
            2,
          ),
          "utf-8",
        );
      } catch {
        // If write fails, try to ensure directory exists and write empty cache
        await mkdir(getCacheDir(), { recursive: true });
        await writeFile(
          cachePath,
          JSON.stringify(
            { agents: [], lastUpdated: new Date().toISOString() },
            null,
            2,
          ),
          "utf-8",
        );
      }
    }),
});

// Create cache layer
export const CacheLive = Layer.effect(
  CacheService,
  Effect.succeed(createCacheService()),
);
