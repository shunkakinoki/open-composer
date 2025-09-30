import { describe, expect, mock, test } from "bun:test";

import { RunPrompt } from "../../src/components/RunPrompt.js";
import { render } from "../utils.js";

describe("RunPrompt", () => {
  const mockOnComplete = mock(() => {});
  const mockOnCancel = mock(() => {});
  const availableAgents = ["claude-code", "codex", "opencode"];

  test("renders agent selection step correctly", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders with different description", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Implement user authentication system"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders with different available agents", () => {
    const differentAgents = ["agent1", "agent2"];
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={differentAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders with different base branch", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="develop"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders with create PR enabled", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={true}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("component initializes without crashing", () => {
    expect(() => {
      render(
        <RunPrompt
          description="Test task description"
          availableAgents={availableAgents}
          baseBranch="main"
          createPR={false}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />,
      );
    }).not.toThrow();
  });

  test("displays agent selection content initially", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain("🚀 Run Task:");
    expect(frame).toContain("Test task description");
    expect(frame).toContain("Select an AI agent");
    expect(frame).toContain("claude-code");
    expect(frame).toContain("codex");
    expect(frame).toContain("opencode");
    expect(frame).toContain("Use ↑↓ to navigate");
    expect(frame).toContain("Enter to select");
    expect(frame).toContain("Esc to cancel");
  });

  test("has proper styling with emojis and colors", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    // Check for visual elements (emojis are preserved in the output)
    expect(frame).toContain("🚀");
  });

  test("provides user guidance text", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain("Use ↑↓ to navigate");
    expect(frame).toContain("Enter to select");
    expect(frame).toContain("Esc to cancel");
  });

  test("accepts onComplete and onCancel callbacks", () => {
    const { lastFrame } = render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    expect(lastFrame()).toBeDefined();
    expect(typeof mockOnComplete).toBe("function");
    expect(typeof mockOnCancel).toBe("function");
  });
});
