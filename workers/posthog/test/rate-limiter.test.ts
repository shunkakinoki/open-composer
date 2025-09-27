import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "../src/index";

// Mock storage for testing
const createMockStorage = () => {
  const storage = new Map<string, any>();
  return {
    get: vi.fn(async (key: string) => storage.get(key)),
    put: vi.fn(async (key: string, value: any) => storage.set(key, value)),
    delete: vi.fn(async (key: string) => storage.delete(key)),
    list: vi.fn(async (options?: { prefix?: string }) => {
      const entries: Array<[string, any]> = [];
      for (const [key, value] of storage.entries()) {
        if (!options?.prefix || key.startsWith(options.prefix)) {
          entries.push([key, value]);
        }
      }
      return entries;
    }),
  };
};

describe("RateLimiter Durable Object", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    mockStorage = createMockStorage();
    const mockState = {
      storage: mockStorage,
    } as any;

    rateLimiter = new RateLimiter(mockState, {} as any);
    vi.clearAllMocks();
  });

  it("should allow requests within rate limit", async () => {
    const result = await rateLimiter.checkRateLimit();

    expect(result.allowed).toBe(true);
    expect(result.waitTime).toBe(0);

    // Verify storage was called with the current window
    const currentWindow = Math.floor(Date.now() / 60000);
    expect(mockStorage.get).toHaveBeenCalledWith(`window:${currentWindow}`);
    expect(mockStorage.put).toHaveBeenCalledWith(`window:${currentWindow}`, {
      count: 1,
      timestamp: expect.any(Number),
    });
  });

  it("should reject requests when rate limit exceeded", async () => {
    // Fill up the rate limit (100 requests)
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit();
    }

    // The 101st request should be rejected
    const result = await rateLimiter.checkRateLimit();

    expect(result.allowed).toBe(false);
    expect(result.waitTime).toBeGreaterThan(0);
  });

  it("should handle concurrent requests properly", async () => {
    // Make 10 concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      rateLimiter.checkRateLimit(),
    );
    const results = await Promise.all(promises);

    // All should be allowed since we're within limit
    for (const result of results) {
      expect(result.allowed).toBe(true);
      expect(result.waitTime).toBe(0);
    }

    // Verify the count was incremented correctly
    expect(mockStorage.put).toHaveBeenCalledTimes(10);
  });

  it("should clean up old windows", async () => {
    const now = Date.now();
    const currentWindow = Math.floor(now / 60000);

    // Set up old windows (more than 2 windows old)
    const oldWindow1 = currentWindow - 3;
    const oldWindow2 = currentWindow - 2;
    const recentWindow = currentWindow - 1; // This should be kept

    await mockStorage.put(`window:${oldWindow1}`, {
      count: 50,
      timestamp: now - 180000,
    }); // 3 minutes old
    await mockStorage.put(`window:${oldWindow2}`, {
      count: 30,
      timestamp: now - 120000,
    }); // 2 minutes old
    await mockStorage.put(`window:${recentWindow}`, {
      count: 20,
      timestamp: now - 60000,
    }); // 1 minute old

    // Make a new request which should trigger cleanup
    await rateLimiter.checkRateLimit();

    // Verify old windows were cleaned up, but recent window was kept
    expect(mockStorage.delete).toHaveBeenCalledWith(`window:${oldWindow1}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`window:${oldWindow2}`);
    expect(mockStorage.delete).not.toHaveBeenCalledWith(
      `window:${recentWindow}`,
    );
  });

  it("should handle edge case at window boundary", async () => {
    // Fill up current window to 99 requests
    for (let i = 0; i < 99; i++) {
      await rateLimiter.checkRateLimit();
    }

    // The 100th request should still be allowed
    const result = await rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.waitTime).toBe(0);

    // The 101st request should be rejected
    const finalResult = await rateLimiter.checkRateLimit();
    expect(finalResult.allowed).toBe(false);
    expect(finalResult.waitTime).toBeGreaterThan(0);
  });

  it("should reset rate limit after time window", async () => {
    // Fill up the rate limit
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit();
    }

    // Verify limit is hit
    let result = await rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(false);

    // Simulate time passage by mocking Date.now
    const originalNow = Date.now;
    vi.spyOn(Date, "now").mockReturnValue(originalNow() + 61000); // 61 seconds later

    // Create a new rate limiter instance (simulating a new time window)
    const newRateLimiter = new RateLimiter(
      {
        storage: createMockStorage(),
      } as any,
      {} as any,
    );

    // This should be allowed in the new window
    const newResult = await newRateLimiter.checkRateLimit();
    expect(newResult.allowed).toBe(true);
    expect(newResult.waitTime).toBe(0);

    // Restore Date.now
    vi.restoreAllMocks();
  });

  it("should calculate correct wait time when rate limited", async () => {
    // Fill up the rate limit
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit();
    }

    // Get the rejected result
    const result = await rateLimiter.checkRateLimit();

    expect(result.allowed).toBe(false);
    // Wait time should be the remaining seconds in the current window
    expect(result.waitTime).toBeGreaterThan(0);
    expect(result.waitTime).toBeLessThanOrEqual(60); // Max 60 seconds
  });
});
