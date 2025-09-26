import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";

describe("PostHog Anonymous Logger Worker", () => {
  beforeEach(() => {
    // Mock fetch for PostHog API calls
    global.fetch = vi.fn();
  });

  it("should handle CORS preflight requests", async () => {
    const request = new Request("https://example.com/", {
      method: "OPTIONS",
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });

  it("should reject non-POST requests", async () => {
    const request = new Request("https://example.com/", {
      method: "GET",
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Method not allowed");
  });

  it("should process valid POST requests and forward to PostHog", async () => {
    const mockPostHogResponse = new Response(JSON.stringify({ status: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockPostHogResponse,
    );

    const eventData = {
      event: "test_event",
      properties: {
        page: "home",
        button: "signup",
      },
      anonymous_id: "test-uuid",
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.168.1.1",
      },
      body: JSON.stringify(eventData),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as {
      success: boolean;
      event_id: string;
    };

    expect(responseBody.success).toBe(true);
    expect(responseBody.event_id).toBeDefined();

    // Verify PostHog was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/capture/"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("should handle invalid JSON in request body", async () => {
    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.168.1.1",
      },
      body: "invalid json",
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: string;
      message: string;
    };
    expect(body.error).toBe("Invalid request body");
    expect(body.message).toBeDefined();
  });

  it("should sanitize event data for anonymity", async () => {
    const mockPostHogResponse = new Response(JSON.stringify({ status: 1 }), {
      status: 200,
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockPostHogResponse,
    );

    const eventData = {
      event: "test_event",
      properties: {
        $set: { email: "user@example.com" },
        $set_once: { name: "John Doe" },
        distinct_id: "user123",
        normal_prop: "safe_value",
      },
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.168.1.1",
      },
      body: JSON.stringify(eventData),
    });

    const ctx = createExecutionContext();
    await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    const fetchCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, { body: string }];
    const sentBody = JSON.parse(fetchCall[1].body) as {
      properties: Record<string, unknown>;
    };

    // Verify identifying properties are removed
    expect(sentBody.properties.$set).toBeUndefined();
    expect(sentBody.properties.$set_once).toBeUndefined();
    expect(sentBody.properties.distinct_id).toBeUndefined();

    // Verify safe properties are preserved
    expect(sentBody.properties.normal_prop).toBe("safe_value");

    // Verify anonymous identifiers are added
    expect(sentBody.properties.$ip).toBe("192.168.1.1");
    expect(sentBody.properties.anonymous_id).toBeDefined();
  });
});

describe("RateLimiter Durable Object", () => {
  it("should allow requests within rate limit", async () => {
    const id = env.RATE_LIMITER.idFromName("test-ip");
    const stub = env.RATE_LIMITER.get(id);

    const result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };

    expect(result.allowed).toBe(true);
    expect(result.waitTime).toBe(0);
  });

  it("should reject requests when rate limit exceeded", async () => {
    const id = env.RATE_LIMITER.idFromName("test-ip-limited");
    const stub = env.RATE_LIMITER.get(id);

    // Make 100 requests to hit the limit
    for (let i = 0; i < 100; i++) {
      await (stub as any).checkRateLimit();
    }

    // The 101st request should be rejected
    const result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };

    expect(result.allowed).toBe(false);
    expect(result.waitTime).toBeGreaterThan(0);
  });

  it("should reset rate limit after time window", async () => {
    const id = env.RATE_LIMITER.idFromName("test-ip-reset");
    const stub = env.RATE_LIMITER.get(id);

    // Fill up the rate limit
    for (let i = 0; i < 100; i++) {
      await (stub as any).checkRateLimit();
    }

    // Verify limit is hit
    let result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result.allowed).toBe(false);

    // Wait for window to reset (simulate time passage)
    // Note: In real tests, you might need to mock Date.now() or use longer waits
    await new Promise((resolve) => setTimeout(resolve, 61000));

    result = (await (stub as any).checkRateLimit()) as {
      allowed: boolean;
      waitTime: number;
    };
    expect(result.allowed).toBe(true);
  });
});
