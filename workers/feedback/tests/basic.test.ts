import type { Feedback } from "@open-composer/feedback";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index.js";

// Mock the Linear SDK
vi.mock("@linear/sdk", () => ({
  LinearClient: vi.fn().mockImplementation(() => ({
    createIssue: vi.fn(),
  })),
}));

// Mock environment for basic testing
const mockEnv: Env = {
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

  it("should process valid POST requests with email and message and return feedback object with Linear issue", async () => {
    // Mock Linear client
    const mockLinearClient = {
      createIssue: vi.fn().mockResolvedValue({
        success: true,
        issue: Promise.resolve({ id: "issue-456" }),
      }),
    };

    const { LinearClient } = await import("@linear/sdk");
    (LinearClient as any).mockImplementation(() => mockLinearClient);

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

    const responseBody = (await response.json()) as { feedback: Feedback; linearIssueId: string };

    // Validate response structure matches Feedback interface
    expect(responseBody.feedback).toHaveProperty("id");
    expect(responseBody.feedback.email).toBe(requestBody.email);
    expect(responseBody.feedback.message).toBe(requestBody.message);
    expect(responseBody.feedback).toHaveProperty("createdAt");
    expect(typeof responseBody.feedback.id).toBe("string");
    expect(typeof responseBody.feedback.createdAt).toBe("string");

    // Validate Linear issue ID is returned
    expect(responseBody.linearIssueId).toBe("issue-456");

    // Verify response structure
    expect(responseBody).toEqual({
      feedback: {
        id: expect.any(String),
        email: requestBody.email,
        message: requestBody.message,
        createdAt: expect.any(String),
      },
      linearIssueId: "issue-456",
    });
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

});
