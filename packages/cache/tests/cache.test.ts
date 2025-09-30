import { describe, expect, test } from "bun:test";
import type { AgentCache } from "../src/index.js";

describe.concurrent("Cache", () => {
  test.concurrent("should define AgentCache interface", async () => {
    const cache: AgentCache = {
      agents: [
        {
          name: "claude-code",
          available: true,
          lastChecked: "2024-01-01T00:00:00.000Z",
        },
      ],
      lastUpdated: "2024-01-01T00:00:00.000Z",
    };

    expect(cache.agents).toHaveLength(1);
    expect(cache.agents[0]?.name).toBe("claude-code");
    expect(cache.agents[0]?.available).toBe(true);
    expect(cache.lastUpdated).toBe("2024-01-01T00:00:00.000Z");
  });

  test.concurrent("should allow empty agent cache", async () => {
    const cache: AgentCache = {
      agents: [],
      lastUpdated: "2024-01-01T00:00:00.000Z",
    };

    expect(cache.agents).toHaveLength(0);
  });
});
