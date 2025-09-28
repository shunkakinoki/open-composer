import { describe, expect, test } from "bun:test";

import { CodeEditor } from "../../src/components/CodeEditor.js";
import { render } from "../utils.js";

describe("CodeEditor", () => {
  test("renders correctly with file", () => {
    const { lastFrame } = render(<CodeEditor currentFile="src/index.ts" />);
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders correctly without file", () => {
    const { lastFrame } = render(<CodeEditor />);
    expect(lastFrame()).toMatchSnapshot();
  });
});
