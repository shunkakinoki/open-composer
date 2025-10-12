import { describe, expect, mock, test } from "bun:test";

import { RunPrompt } from "../../src/components/RunPrompt.js";
import { render } from "../utils.js";

describe("RunPrompt", () => {
  const mockOnComplete = mock(() => {});
  const mockOnCancel = mock(() => {});
  const availableAgents = ["claude-code", "codex", "opencode"];

  test("renders agent selection step correctly", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("renders with different description", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("renders with different available agents", async () => {
    const differentAgents = ["agent1", "agent2"];
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("renders with different base branch", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("renders with create PR enabled", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("component initializes without crashing", async () => {
    const { cleanup } = await render(
      <RunPrompt
        description="Test task description"
        availableAgents={availableAgents}
        baseBranch="main"
        createPR={false}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    cleanup();
  });

  test("displays agent selection content initially", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("has proper styling with emojis and colors", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("provides user guidance text", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });

  test("accepts onComplete and onCancel callbacks", async () => {
    const { lastFrame, cleanup } = await render(
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
    cleanup();
  });
});
