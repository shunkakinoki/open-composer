import { afterAll, afterEach } from "bun:test";
import { configure } from "@testing-library/react";
import { cleanup } from "./utils";

// Mock CLI version to keep snapshots stable across version changes
// This must be done before any imports that use CLI_VERSION
mock.module("../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0",
}));

// Mock Date immediately to catch all Date usage - do this at the very beginning
const mockDate = new Date("2024-01-01T10:00:00Z");
const OriginalDate = global.Date;

// Create Date mock class
const MockDate = class extends OriginalDate {
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

  toLocaleTimeString(
    _locales?: string | string[],
    _options?: Intl.DateTimeFormatOptions,
  ) {
    return "10:00";
  }

  toLocaleDateString(
    _locales?: string | string[],
    _options?: Intl.DateTimeFormatOptions,
  ) {
    return "1/1/2024";
  }
};

// Apply Date mocking immediately - this must happen before any other code
global.Date = MockDate as typeof OriginalDate;
const originalNow = Date.now;
Date.now = () => mockDate.getTime();

// Configure React Testing Library
configure({
  // Disable error boundaries during tests
  reactStrictMode: false,
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  // Restore original Date
  global.Date = OriginalDate;
  Date.now = originalNow;

  cleanup();
});
