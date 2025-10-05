import { describe, expect, it } from "bun:test";
import {
  createFeedback,
  type Feedback,
  validateFeedback,
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
});
