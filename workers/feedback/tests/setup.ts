import { afterAll, beforeAll, vi } from "vitest";

// Global test setup
beforeAll(() => {
  // Mock Date for consistent timestamps
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
});

afterAll(() => {
  vi.useRealTimers();
});
