// Global declarations for Cloudflare Workers runtime
declare const DurableObject: {
  new (state: DurableObjectState, env: Env): RateLimiter;
};

interface IncomingEvent {
  event?: string;
  properties?: Record<string, unknown>;
  anonymous_id?: string;
  timestamp?: string;
}

interface PostHogEvent {
  api_key: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

interface RateLimitResult {
  allowed: boolean;
  waitTime: number;
}

export interface WindowData {
  count: number;
  timestamp: number;
}

export class RateLimiter {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
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
      // Parse the incoming request body
      const body: IncomingEvent = await request.json();

      // Create anonymous event data for PostHog
      const anonymousEvent: PostHogEvent = {
        api_key: env.POSTHOG_PROJECT_API_KEY,
        event: body.event || "anonymous_event",
        properties: {
          ...body.properties,
          // Add anonymous identifiers
          $ip: ipAddress,
          anonymous_id: body.anonymous_id || crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          // Remove any potentially identifying information
          $set: undefined,
          $set_once: undefined,
          distinct_id: undefined,
        },
        timestamp: body.timestamp || new Date().toISOString(),
      };

      // Forward to PostHog
      const posthogResponse = await fetch(`${env.POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Anonymous-Logger-Worker/1.0",
        },
        body: JSON.stringify(anonymousEvent),
      });

      const responseData = {
        success: posthogResponse.ok,
        status: posthogResponse.status,
        event_id: anonymousEvent.properties.anonymous_id,
      };

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
