import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

// Mock environment for basic testing
const mockEnv: Env = {
  POSTHOG_HOST: "https://app.posthog.com",
  POSTHOG_PROJECT_API_KEY: "test-api-key",
  RATE_LIMITER: {
    idFromName: vi.fn(() => "test-id"),
    idFromString: vi.fn(() => "test-id"),
    newUniqueId: vi.fn(() => "test-id"),
    getByName: vi.fn(() => "test-id"),
    get: vi.fn((_id: DurableObjectId) => {
      const mockRateLimiter = {
        id: _id,
        name: undefined,
        checkRateLimit: vi
          .fn()
          .mockResolvedValue({ allowed: true, waitTime: 0 }),
      } as unknown as DurableObjectStub & {
        checkRateLimit: () => Promise<{ allowed: boolean; waitTime: number }>;
      };
      return mockRateLimiter;
    }) as unknown as DurableObjectNamespace["get"],
    jurisdiction: "eu",
  } as unknown as DurableObjectNamespace,
};

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

describe("PostHog Anonymous Logger Worker - Basic Tests", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.crypto = {
      randomUUID: vi.fn(() => "test-uuid-123"),
      getRandomValues: vi.fn(() => new Uint8Array()),
      subtle: {} as SubtleCrypto,
    } as Crypto;
  });

  it("should handle CORS preflight requests", async () => {
    const request = new Request("https://example.com/", {
      method: "OPTIONS",
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

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

    const response = await worker.fetch(request, mockEnv, mockCtx);

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

    const response = await worker.fetch(request, mockEnv, mockCtx);

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

    const response = await worker.fetch(request, mockEnv, mockCtx);

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

    await worker.fetch(request, mockEnv, mockCtx);

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

  it("should handle rate limiting", async () => {
    // Mock rate limiter to reject
    mockEnv.RATE_LIMITER.get = vi.fn(
      (_id: DurableObjectId) =>
        ({
          id: _id,
          name: undefined,
          checkRateLimit: vi
            .fn()
            .mockResolvedValue({ allowed: false, waitTime: 30 }),
        }) as unknown as DurableObjectStub & {
          checkRateLimit: () => Promise<{ allowed: boolean; waitTime: number }>;
        },
    );

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.168.1.1",
      },
      body: JSON.stringify({ event: "test" }),
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");

    const body = (await response.json()) as {
      error: string;
      retryAfter: number;
    };
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfter).toBe(30);
  });
});
