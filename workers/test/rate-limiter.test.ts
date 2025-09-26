import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

describe("RateLimiter Edge Cases", () => {
  it("should handle concurrent requests properly", async () => {
    const id = env.RATE_LIMITER.idFromName("concurrent-test");
    const stub = env.RATE_LIMITER.get(id);

    // Make 10 concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      (stub as any).checkRateLimit(),
    );
    const results = await Promise.all(promises);

    // All should be allowed since we're within limit
    for (const result of results) {
      const typedResult = result as { allowed: boolean; waitTime: number };
      expect(typedResult.allowed).toBe(true);
    }
  });

  it("should clean up old windows", async () => {
    const id = env.RATE_LIMITER.idFromName("cleanup-test");
    const stub = env.RATE_LIMITER.get(id);

    // Make some requests
    await (stub as any).checkRateLimit();

    // Fast forward time by more than 2 minutes to trigger cleanup
    vi.advanceTimersByTime(130000); // 2 minutes 10 seconds

    // Make another request which should trigger cleanup
    const result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };

    expect(result.allowed).toBe(true);
  });

  it("should handle edge case at window boundary", async () => {
    const id = env.RATE_LIMITER.idFromName("boundary-test");
    const stub = env.RATE_LIMITER.get(id);

    // Fill up current window
    for (let i = 0; i < 99; i++) {
      await (stub as any).checkRateLimit();
    }

    // One more should be allowed
    let result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result.allowed).toBe(true);

    // Next one should be rejected
    result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result.allowed).toBe(false);
    expect(result.waitTime).toBeGreaterThan(0);
    expect(result.waitTime).toBeLessThanOrEqual(60);
  });

  it("should handle multiple IPs independently", async () => {
    const id1 = env.RATE_LIMITER.idFromName("ip-1");
    const id2 = env.RATE_LIMITER.idFromName("ip-2");
    const stub1 = env.RATE_LIMITER.get(id1);
    const stub2 = env.RATE_LIMITER.get(id2);

    // Fill up limit for first IP
    for (let i = 0; i < 100; i++) {
      await (stub1 as any).checkRateLimit();
    }

    // First IP should be limited
    const result1 = (await (stub1 as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result1.allowed).toBe(false);

    // Second IP should still be allowed
    const result2 = (await (stub2 as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result2.allowed).toBe(true);
  });
});
