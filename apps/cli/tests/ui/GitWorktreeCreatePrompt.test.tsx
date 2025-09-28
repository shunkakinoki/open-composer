import { describe, expect, mock, test } from "bun:test";

import { GitWorktreeCreatePrompt } from "../../src/components/GitWorktreeCreatePrompt.js";
import { render } from "../utils.js";

describe("GitWorktreeCreatePrompt", () => {
  test("renders correctly", () => {
    const mockOnSubmit = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <GitWorktreeCreatePrompt
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });
});
