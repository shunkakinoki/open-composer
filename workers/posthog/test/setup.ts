import { afterAll, beforeAll, vi } from "vitest";

// Global test setup
beforeAll(() => {
  // Mock crypto.randomUUID for consistent testing
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: vi.fn(() => "test-uuid-123"),
    },
    writable: true,
  });

  // Mock Date for consistent timestamps
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
});

afterAll(() => {
  vi.useRealTimers();
});
