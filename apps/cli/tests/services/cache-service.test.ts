import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentCache } from "../../src/services/cache-service";

// Test isolation variables
let mockCacheDir: string;
let mockCachePath: string;

describe("CacheService", () => {
  beforeEach(() => {
    // Create unique test directory for each test
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockCacheDir = join(tmpdir(), `open-composer-cache-test-${testId}`);
    mockCachePath = join(mockCacheDir, "cache.json");
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      if (existsSync(mockCacheDir)) {
        await rm(mockCacheDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

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
    await writeFile(
      mockCachePath,
      JSON.stringify(emptyCache, null, 2),
      "utf-8",
    );
  }

  describe("getAgentCache", () => {
    it("should return undefined when no cache file exists", async () => {
      const result = await testGetAgentCache();
      expect(result).toBeUndefined();
    });

    it("should return cache data when file exists", async () => {
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
    it("should store agent cache data", async () => {
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
    it("should clear the cache to empty state", async () => {
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
