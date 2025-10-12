import { describe, expect, test } from "bun:test";
import React from "react";

import { CodeEditor } from "../../src/components/CodeEditor.js";
import { render } from "../utils.js";

describe("CodeEditor", () => {
  test("renders correctly with file", async () => {
    const { lastFrame, cleanup } = await render(<CodeEditor currentFile="src/index.ts" />);
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders correctly without file", async () => {
    const { lastFrame, cleanup } = await render(<CodeEditor />);
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
