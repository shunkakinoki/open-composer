import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  createFeedback,
  type Feedback,
  validateFeedback,
  submitFeedback,
} from "../src/index.js";

describe("Feedback Package", () => {
  describe("createFeedback", () => {
    it("should create a feedback object with valid properties", () => {
      const email = "test@example.com";
      const message = "This is a test feedback";

      const feedback = createFeedback(email, message);

      expect(feedback).toHaveProperty("id");
      expect(feedback.email).toBe(email);
      expect(feedback.message).toBe(message);
      expect(feedback).toHaveProperty("createdAt");
      expect(typeof feedback.createdAt).toBe("string");
    });

    it("should generate unique IDs for different feedbacks", () => {
      const feedback1 = createFeedback("test1@example.com", "Message 1");
      const feedback2 = createFeedback("test2@example.com", "Message 2");

      expect(feedback1.id).not.toBe(feedback2.id);
    });
  });

  describe("validateFeedback", () => {
    it("should return true for valid feedback", () => {
      const feedback = createFeedback("test@example.com", "Valid message");
      expect(validateFeedback(feedback)).toBe(true);
    });

    it("should return false for feedback with empty email", () => {
      const feedback = createFeedback("", "Valid message");
      expect(validateFeedback(feedback)).toBe(false);
    });

    it("should return false for feedback with empty message", () => {
      const feedback = createFeedback("test@example.com", "");
      expect(validateFeedback(feedback)).toBe(false);
    });

    it("should return false for feedback with missing id", () => {
      const feedback = {
        email: "test@example.com",
        message: "Valid message",
        createdAt: new Date().toISOString(),
      } as Omit<Feedback, "id">;
      expect(validateFeedback(feedback as Feedback)).toBe(false);
    });
  });

  describe("submitFeedback", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = mock(() => ({})) as any;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should submit feedback successfully", async () => {
      const mockResponse = {
        feedback: {
          id: "feedback-123",
          email: "test@example.com",
          message: "Test message",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        linearIssueId: "issue-456",
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: mock(() => Promise.resolve(mockResponse)),
      });

      const result = await submitFeedback("test@example.com", "Test message");

      expect(result.id).toBe("feedback-123");
      expect(result.email).toBe("test@example.com");
      expect(result.message).toBe("Test message");
      expect(global.fetch).toHaveBeenCalledWith("http://localhost:8787", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", message: "Test message" }),
      });
    });

    it("should use custom worker URL from environment", async () => {
      const originalEnv = process.env.FEEDBACK_WORKER_URL;
      process.env.FEEDBACK_WORKER_URL = "https://custom-worker.com";

      const mockResponse = {
        feedback: {
          id: "feedback-123",
          email: "test@example.com",
          message: "Test message",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        linearIssueId: "issue-456",
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: mock(() => Promise.resolve(mockResponse)),
      });

      await submitFeedback("test@example.com", "Test message");

      expect(global.fetch).toHaveBeenCalledWith("https://custom-worker.com", expect.any(Object));

      // Restore original env
      process.env.FEEDBACK_WORKER_URL = originalEnv;
    });

    it("should throw error on HTTP failure", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
      });

      expect(async () => {
        await submitFeedback("test@example.com", "Test message");
      }).toThrow("Failed to submit feedback: Internal Server Error");
    });
  });
});
