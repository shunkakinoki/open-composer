import { afterAll, beforeAll } from "bun:test";
import { configure } from "@testing-library/react";

// Configure React Testing Library
configure({
  // Disable error boundaries during tests
  reactStrictMode: false,
});

// Mock Date to return consistent timestamps for snapshot testing
const mockDate = new Date("2024-01-01T10:00:00Z");
const OriginalDate = global.Date;
let originalNow: () => number;

beforeAll(() => {
  // Mock Date constructor and methods
  global.Date = class extends OriginalDate {
    constructor(arg?: string | number | Date) {
      if (arg === undefined) {
        super(mockDate.getTime());
      } else {
        super(arg);
      }
    }

    static now() {
      return mockDate.getTime();
    }
  } as typeof OriginalDate;

  // Mock Date prototype methods
  global.Date.prototype.toLocaleTimeString = function (
    this: Date,
    _locales?: string | string[],
    _options?: Intl.DateTimeFormatOptions,
  ) {
    return "10:00";
  };

  global.Date.prototype.toLocaleDateString = function (
    this: Date,
    _locales?: string | string[],
    _options?: Intl.DateTimeFormatOptions,
  ) {
    return "1/1/2024";
  };

  // Ensure new Date() calls are properly mocked
  originalNow = Date.now;
  Date.now = () => mockDate.getTime();
});

afterAll(() => {
  // Restore original Date
  global.Date = OriginalDate;
  Date.now = originalNow;
});
