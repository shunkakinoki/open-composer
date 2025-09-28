import { describe, expect, it } from "bun:test";
import type { AgentCache } from "../src/index.js";

describe("Cache", () => {
  it("should define AgentCache interface", () => {
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

  it("should allow empty agent cache", () => {
    const cache: AgentCache = {
      agents: [],
      lastUpdated: "2024-01-01T00:00:00.000Z",
    };

    expect(cache.agents).toHaveLength(0);
  });
});
