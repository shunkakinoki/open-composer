import { describe, expect, test } from "bun:test";
import { Text } from "ink";

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
