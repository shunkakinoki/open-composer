import { describe, expect, mock, test } from "bun:test";
import React from "react";

// Mock ComposerApp utility functions before importing
const mockCreateTimestamp = mock(() => new Date("2024-01-01T10:00:00Z"));
const mockGetCurrentTime = mock(() =>
  new Date("2024-01-01T10:00:00Z").getTime(),
);

mock.module("../../src/components/ComposerApp.js", () => ({
  createTimestamp: mockCreateTimestamp,
  getCurrentTime: mockGetCurrentTime,
}));

// Mock CLI version to keep snapshots stable across version changes
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0",
}));

import { ComposerApp } from "../../src/components/ComposerApp.js";
import { render } from "../utils.js";

describe("ComposerApp", () => {
  test("renders correctly", async () => {
    const { lastFrame, cleanup } = await render(<ComposerApp />);
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
