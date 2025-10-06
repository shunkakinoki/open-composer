import { describe, expect, mock, test } from "bun:test";

import { RunCreatePrompt } from "../../src/components/RunCreatePrompt.js";
import { render } from "../utils.js";

// Mock the RunsCli to avoid database operations during testing
mock.module("../../src/services/runs-cli.js", () => ({
  RunsCli: {
    createInteractive: mock(async () => 123),
  },
}));

describe("RunCreatePrompt", () => {
  test("renders name input step when no props provided", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <RunCreatePrompt
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders workspace choice step when name is provided", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <RunCreatePrompt
        initialName="Test Run"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders workspace path step when name and choice are provided", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <RunCreatePrompt
        initialName="Test Run"
        initialWorkspaceChoice="existing"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders confirmation step when all props are provided", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <RunCreatePrompt
        initialName="Test Run"
        initialWorkspaceChoice="none"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });
});
