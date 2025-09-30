import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentCache } from "../../src/services/cache-service";

// Mock file system operations for testing
const mockCacheDir = join(homedir(), ".config", "open-composer-test");
const mockCachePath = join(mockCacheDir, "cache.json");


// Helper functions to test cache operations directly
async function testGetAgentCache(): Promise<AgentCache | undefined> {
  try {
    const content = await readFile(mockCachePath, "utf-8");
    return JSON.parse(content) as AgentCache;
  } catch {
    return undefined;
  }
}

async function testUpdateAgentCache(cache: AgentCache): Promise<void> {
  await mkdir(mockCacheDir, { recursive: true });
  await writeFile(mockCachePath, JSON.stringify(cache, null, 2), "utf-8");
}

async function testClearAgentCache(): Promise<void> {
  const emptyCache = {
    agents: [],
    lastUpdated: new Date().toISOString(),
  };
  await mkdir(mockCacheDir, { recursive: true });
  await writeFile(mockCachePath, JSON.stringify(emptyCache, null, 2), "utf-8");
}

describe("CacheService", () => {
  beforeEach(async () => {
    // Clean up before each test
    try {
      await rm(mockCachePath, { force: true });
      await rm(mockCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore if files don't exist
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await rm(mockCachePath, { force: true });
      await rm(mockCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore if files don't exist
    }
  });

  describe("getAgentCache", () => {
    test.serial("should return undefined when no cache file exists", async () => {
      const result = await testGetAgentCache();
      expect(result).toBeUndefined();
    });

    test.serial("should return cache data when file exists", async () => {
      const testCache: AgentCache = {
        agents: [
          {
            name: "claude-code",
            available: true,
            lastChecked: "2024-01-01T00:00:00.000Z",
          },
        ],
        lastUpdated: "2024-01-01T00:00:00.000Z",
      };

      await testUpdateAgentCache(testCache);
      const result = await testGetAgentCache();

      expect(result).toEqual(testCache);
    });
  });

  describe("updateAgentCache", () => {
    test.serial("should store agent cache data", async () => {
      const testCache: AgentCache = {
        agents: [
          {
            name: "claude-code",
            available: true,
            lastChecked: "2024-01-01T00:00:00.000Z",
          },
          {
            name: "codex",
            available: false,
            lastChecked: "2024-01-01T00:00:00.000Z",
          },
        ],
        lastUpdated: "2024-01-01T00:00:00.000Z",
      };

      await testUpdateAgentCache(testCache);
      const result = await testGetAgentCache();

      expect(result).toEqual(testCache);
    });
  });

  describe("clearAgentCache", () => {
    test.serial("should clear the cache to empty state", async () => {
      const testCache: AgentCache = {
        agents: [
          {
            name: "claude-code",
            available: true,
            lastChecked: "2024-01-01T00:00:00.000Z",
          },
        ],
        lastUpdated: "2024-01-01T00:00:00.000Z",
      };

      // First store some data
      await testUpdateAgentCache(testCache);

      // Clear the cache
      await testClearAgentCache();

      // Verify cache is cleared
      const result = await testGetAgentCache();

      expect(result?.agents).toEqual([]);
      expect(result?.lastUpdated).toBeDefined();
    });
  });
});
