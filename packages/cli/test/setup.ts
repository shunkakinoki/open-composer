import { afterAll, beforeAll } from "bun:test";
import { configure } from "@testing-library/react";

// Configure React Testing Library
configure({
  // Disable error boundaries during tests
  reactStrictMode: false,
});

// Global test setup
beforeAll(() => {
  // Any global setup can go here
});

afterAll(() => {
  // Any global cleanup can go here
});
