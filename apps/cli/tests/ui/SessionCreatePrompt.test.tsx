import { describe, expect, mock, test } from "bun:test";

import { SessionCreatePrompt } from "../../src/components/SessionCreatePrompt.js";
import { render } from "../utils.js";

// Mock the SessionsCli to avoid database operations during testing
mock.module("../../src/services/sessions-cli.js", () => ({
  SessionsCli: {
    createInteractive: mock(async () => 123),
  },
}));

describe("SessionCreatePrompt", () => {
  test("renders name input step when no props provided", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SessionCreatePrompt
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
      <SessionCreatePrompt
        initialName="Test Session"
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
      <SessionCreatePrompt
        initialName="Test Session"
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
      <SessionCreatePrompt
        initialName="Test Session"
        initialWorkspaceChoice="none"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });
});
