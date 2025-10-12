import { describe, expect, mock, test } from "bun:test";
import React from "react";

// Mock the CLI version specifically for Layout tests
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0",
}));

import { Layout } from "../../src/components/Layout.js";
import { render } from "../utils.js";

describe("Layout", () => {
  test("renders correctly", async () => {
    const { lastFrame, cleanup } = await render(
      <Layout>
        <text content="Test content" />
      </Layout>,
    );
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
