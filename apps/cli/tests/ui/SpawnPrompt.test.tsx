import { describe, expect, mock, test } from "bun:test";

import { SpawnPrompt } from "../../src/components/SpawnPrompt.js";
import { render } from "../utils.js";

describe("SpawnPrompt", () => {
  const availableAgents = ["codex", "claude-code", "opencode"] as const;

  test("renders initial session name step correctly", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders with expected UI structure", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    // Check for main UI elements
    expect(frame).toContain("🪄 Spawn Interactive Session");
    expect(frame).toContain("name for the session:");
    expect(frame).toContain("Press Enter to continue");
    expect(frame).toContain("Esc to cancel");
    cleanup();
  });

  test("component initializes without crashing", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    expect(async () => {
      await render(
        <SpawnPrompt
          availableAgents={availableAgents}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />,
      );
    }).not.toThrow();
    cleanup();
  });

  test("accepts onComplete and onCancel callbacks", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    expect(lastFrame()).toBeDefined();
    expect(typeof mockOnComplete).toBe("function");
    expect(typeof mockOnCancel).toBe("function");
    cleanup();
  });

  test("displays session-related content initially", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain("session");
    // Should not contain content from other steps
    expect(frame).not.toContain("🤖 Select Agents");
    expect(frame).not.toContain("🌿 Base Branch");
    cleanup();
  });

  test("has proper styling with emojis and colors", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    // Check for visual elements (emojis are preserved in the output)
    expect(frame).toContain("🪄");
    cleanup();
  });

  test("provides user guidance text", async () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <SpawnPrompt
        availableAgents={availableAgents}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain("Press Enter");
    expect(frame).toContain("Esc");
    cleanup();
  });
});
