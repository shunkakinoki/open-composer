// Import DurableObject from Workers runtime
import { DurableObject } from "cloudflare:workers";

interface RateLimitResult {
  allowed: boolean;
  waitTime: number;
}

export interface WindowData {
  count: number;
  timestamp: number;
}

export class RateLimiter extends DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    super(state, _env);
    this.state = state;
  }

  async checkRateLimit(): Promise<RateLimitResult> {
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute
    const maxRequests = 100;

    // Get current window data
    const currentWindow = Math.floor(now / windowSize);
    const stored: WindowData = (await this.state.storage.get(
      `window:${currentWindow}`,
    )) || { count: 0, timestamp: now };

    // Clean up old windows
    const oldWindows = await this.state.storage.list({ prefix: "window:" });
    for (const [key] of oldWindows) {
      const windowNum = Number.parseInt(key.split(":")[1], 10);
      if (windowNum < currentWindow - 1) {
        await this.state.storage.delete(key);
      }
    }

    // Check if limit exceeded
    if (stored.count >= maxRequests) {
      const waitTime = Math.ceil((windowSize - (now % windowSize)) / 1000);
      return { allowed: false, waitTime };
    }

    // Increment counter
    stored.count += 1;
    stored.timestamp = now;
    await this.state.storage.put(`window:${currentWindow}`, stored);

    return { allowed: true, waitTime: 0 };
  }
}

export interface Env {
  POSTHOG_HOST: string;
  POSTHOG_PROJECT_API_KEY: string;
  RATE_LIMITER: DurableObjectNamespace;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function createCorsResponse(
  body: string | null,
  status: number,
  additionalHeaders: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...additionalHeaders,
    },
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    // Only allow POST requests for logging
    if (request.method !== "POST") {
      return createCorsResponse(
        JSON.stringify({ error: "Method not allowed" }),
        405,
      );
    }

    const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";

    // Apply rate limit using Durable Objects for more precise control
    const rateLimiterId = env.RATE_LIMITER.idFromName(ipAddress);
    const rateLimiterStub = env.RATE_LIMITER.get(rateLimiterId);

    const { allowed, waitTime }: RateLimitResult = await (
      rateLimiterStub as unknown as RateLimiter
    ).checkRateLimit();

    if (!allowed) {
      return createCorsResponse(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: waitTime,
        }),
        429,
        { "Retry-After": waitTime.toString() },
      );
    }

    try {
      // Get the raw request body
      const bodyText = await request.text();
      const body = JSON.parse(bodyText);

      // Log the incoming request for debugging
      console.log("Received request body:", JSON.stringify(body, null, 2));

      // Simply replace the API key with the correct one and forward as-is
      body.api_key = env.POSTHOG_PROJECT_API_KEY;

      console.log("Forwarding to PostHog with corrected API key");

      // Forward the request to PostHog with the corrected API key
      const requestUrl = new URL(request.url);
      const posthogResponse = await fetch(
        `${env.POSTHOG_HOST}${requestUrl.pathname}${requestUrl.search}`,
        {
          method: request.method,
          headers: {
            "Content-Type":
              request.headers.get("Content-Type") || "application/json",
            "User-Agent": "Anonymous-Logger-Worker/1.0",
          },
          body: JSON.stringify(body),
        },
      );

      const responseData = {
        success: posthogResponse.ok,
        status: posthogResponse.status,
        forwarded: true,
      };

      console.log("PostHog response:", {
        ok: posthogResponse.ok,
        status: posthogResponse.status,
        headers: Object.fromEntries(posthogResponse.headers.entries()),
      });

      // If PostHog request fails, return the error but don't crash
      if (!posthogResponse.ok) {
        const errorText = await posthogResponse.text();
        console.error("PostHog API error:", {
          status: posthogResponse.status,
          statusText: posthogResponse.statusText,
          body: errorText,
        });
      }

      return createCorsResponse(
        JSON.stringify(responseData),
        posthogResponse.ok ? 200 : 502,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return createCorsResponse(
        JSON.stringify({
          error: "Invalid request body",
          message: errorMessage,
        }),
        400,
      );
    }
  },
} satisfies ExportedHandler<Env>;
