import { describe, expect, mock, test } from "bun:test";
import { Text } from "ink";

// Mock the CLI version specifically for Layout tests
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0",
}));

import { Layout } from "../../src/components/Layout.js";
import { render } from "../utils.js";

describe("Layout", () => {
  test("renders correctly", () => {
    const { lastFrame } = render(
      <Layout>
        <Text>Test content</Text>
      </Layout>,
    );
    expect(lastFrame()).toMatchSnapshot();
  });
});
