import { describe, expect, mock, test } from "bun:test";

import { SpawnPrompt } from "../../src/components/SpawnPrompt.js";
import { render } from "../utils.js";

describe("SpawnPrompt", () => {
  test("renders initial session name step correctly", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders with expected UI structure", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );

    const frame = lastFrame();
    // Check for main UI elements
    expect(frame).toContain("🪄 Spawn Interactive Session");
    expect(frame).toContain("name for the session:");
    expect(frame).toContain("Press Enter to continue");
    expect(frame).toContain("Esc to cancel");
  });

  test("component initializes without crashing", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    expect(() => {
      render(
        <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
      );
    }).not.toThrow();
  });

  test("accepts onComplete and onCancel callbacks", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );

    expect(lastFrame()).toBeDefined();
    expect(typeof mockOnComplete).toBe("function");
    expect(typeof mockOnCancel).toBe("function");
  });

  test("displays session-related content initially", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );

    const frame = lastFrame();
    expect(frame).toContain("session");
    // Should not contain content from other steps
    expect(frame).not.toContain("🤖 Select Agents");
    expect(frame).not.toContain("🌿 Base Branch");
  });

  test("has proper styling with emojis and colors", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );

    const frame = lastFrame();
    // Check for visual elements (emojis are preserved in the output)
    expect(frame).toContain("🪄");
  });

  test("provides user guidance text", () => {
    const mockOnComplete = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame } = render(
      <SpawnPrompt onComplete={mockOnComplete} onCancel={mockOnCancel} />,
    );

    const frame = lastFrame();
    expect(frame).toContain("Press Enter");
    expect(frame).toContain("Esc");
  });
});
