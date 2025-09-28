import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";

// Agent availability cache interface
export interface AgentCache {
  readonly agents: ReadonlyArray<{
    readonly name: string;
    readonly available: boolean;
    readonly lastChecked: string;
  }>;
  readonly lastUpdated: string;
}

// Cache service interface
export interface CacheServiceInterface {
  readonly getAgentCache: () => Effect.Effect<
    AgentCache | undefined,
    never,
    never
  >;
  readonly updateAgentCache: (
    cache: AgentCache,
  ) => Effect.Effect<void, never, never>;
  readonly clearAgentCache: () => Effect.Effect<void, never, never>;
}

// Cache service tag
export const CacheService = Context.GenericTag<CacheServiceInterface>(
  "@open-composer/cache/CacheService",
);

// Get cache directory path
function getCacheDir(): string {
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
export const CacheLive = Effect.runSync(
  Effect.map(Effect.succeed(createCacheService()), (service) =>
    Context.add(CacheService, service)(Context.empty()),
  ),
);

// Helper functions for common operations
export const getAgentCache = () =>
  CacheService.pipe(Effect.flatMap((cache) => cache.getAgentCache()));

export const updateAgentCache = (cache: AgentCache) =>
  CacheService.pipe(
    Effect.flatMap((cacheService) => cacheService.updateAgentCache(cache)),
  );

export const clearAgentCache = () =>
  CacheService.pipe(Effect.flatMap((cache) => cache.clearAgentCache()));
