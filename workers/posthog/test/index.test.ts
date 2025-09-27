import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

// Mock environment for testing
const mockEnv: Env = {
  POSTHOG_HOST: "https://app.posthog.com",
  POSTHOG_PROJECT_API_KEY: "test-api-key",
  RATE_LIMITER: {
    idFromName: vi.fn((name: string) => ({ toString: () => `id-${name}` })),
    idFromString: vi.fn((id: string) => ({ toString: () => id })),
    newUniqueId: vi.fn(() => ({ toString: () => "unique-id" })),
    getByName: vi.fn((name: string) => ({ toString: () => `id-${name}` })),
    get: vi.fn(() => ({
      fetch: vi.fn(),
      connect: vi.fn(),
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, waitTime: 0 }),
    })),
    jurisdiction: "eu",
  } as unknown as DurableObjectNamespace,
};

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

describe("PostHog Anonymous Logger Worker", () => {
  beforeEach(() => {
    // Mock fetch for PostHog API calls
    global.fetch = vi.fn();
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
      status: number;
      forwarded: boolean;
    };

    expect(responseBody.success).toBe(true);
    expect(responseBody.status).toBe(200);
    expect(responseBody.forwarded).toBe(true);

    // Verify PostHog was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://app.posthog.com/"),
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

  it("should forward event data as-is with only API key replacement", async () => {
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
      api_key: "original-api-key",
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
      api_key: string;
    };

    // Verify all original properties are preserved (no sanitization)
    expect(sentBody.properties.$set).toEqual({ email: "user@example.com" });
    expect(sentBody.properties.$set_once).toEqual({ name: "John Doe" });
    expect(sentBody.properties.distinct_id).toBe("user123");
    expect(sentBody.properties.normal_prop).toBe("safe_value");

    // Verify only the API key is replaced
    expect(sentBody.api_key).toBe("test-api-key");
  });
});
