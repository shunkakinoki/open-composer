import type { Feedback } from "@open-composer/feedback";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index.js";

// Mock environment for basic testing
const mockEnv: Env = {
  FEEDBACK_KV: {
    get: vi.fn(),
    put: vi.fn(),
  } as any,
  LINEAR_API_KEY: "mock-linear-api-key",
  LINEAR_TEAM_ID: "mock-linear-team-id",
};

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

describe("Feedback Worker - Basic Tests", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it("should handle CORS preflight requests", async () => {
    const request = new Request("https://example.com/", {
      method: "OPTIONS",
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(405); // Worker only allows POST
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST");
  });

  it("should reject non-POST requests", async () => {
    const request = new Request("https://example.com/", {
      method: "GET",
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(405);
    const body = await response.text();
    expect(body).toBe("Method not allowed");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should process valid POST requests with email and message and return feedback object", async () => {
    // Mock KV get to return empty array initially
    (mockEnv.FEEDBACK_KV.get as any).mockResolvedValue(null);
    (mockEnv.FEEDBACK_KV.put as any).mockResolvedValue(undefined);

    const requestBody = {
      email: "test@example.com",
      message: "This is a test feedback message",
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const responseBody = (await response.json()) as Feedback;

    // Validate response structure matches Feedback interface
    expect(responseBody).toHaveProperty("id");
    expect(responseBody.email).toBe(requestBody.email);
    expect(responseBody.message).toBe(requestBody.message);
    expect(responseBody).toHaveProperty("createdAt");
    expect(typeof responseBody.id).toBe("string");
    expect(typeof responseBody.createdAt).toBe("string");

    // Verify KV storage was called
    expect(mockEnv.FEEDBACK_KV.get).toHaveBeenCalledWith("feedbacks");
    expect(mockEnv.FEEDBACK_KV.put).toHaveBeenCalledWith(
      "feedbacks",
      expect.stringContaining(requestBody.email),
    );
  });

  it("should handle invalid JSON parsing errors", async () => {
    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "invalid json",
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe("Internal server error");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should reject requests with missing email", async () => {
    const requestBody = {
      message: "This is a test feedback message",
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toBe("Invalid input: email and message are required");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should reject requests with missing message", async () => {
    const requestBody = {
      email: "test@example.com",
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toBe("Invalid input: email and message are required");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should append feedback to existing feedbacks in KV storage", async () => {
    const existingFeedbacks: Feedback[] = [
      {
        id: "existing_1",
        email: "existing@example.com",
        message: "Existing feedback",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    (mockEnv.FEEDBACK_KV.get as any).mockResolvedValue(
      JSON.stringify(existingFeedbacks),
    );
    (mockEnv.FEEDBACK_KV.put as any).mockResolvedValue(undefined);

    const requestBody = {
      email: "new@example.com",
      message: "New feedback message",
    };

    const request = new Request("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(200);

    // Verify the put was called with both existing and new feedback
    expect(mockEnv.FEEDBACK_KV.put).toHaveBeenCalledWith(
      "feedbacks",
      expect.stringContaining("existing@example.com"),
    );
    expect(mockEnv.FEEDBACK_KV.put).toHaveBeenCalledWith(
      "feedbacks",
      expect.stringContaining("new@example.com"),
    );

    // Parse the stored data to verify structure
    const putCall = (mockEnv.FEEDBACK_KV.put as any).mock.calls[0];
    const storedData = JSON.parse(putCall[1] as string) as Feedback[];
    expect(storedData).toHaveLength(2);
    expect(storedData[0].email).toBe("existing@example.com");
    expect(storedData[1].email).toBe("new@example.com");
  });
});
