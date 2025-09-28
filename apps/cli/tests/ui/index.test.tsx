import { describe, expect, mock, test } from "bun:test";
import { Text } from "ink";

// Mock ComposerApp utility functions before importing
const mockCreateTimestamp = mock(() => new Date("2024-01-01T10:00:00Z"));
const mockGetCurrentTime = mock(() =>
  new Date("2024-01-01T10:00:00Z").getTime(),
);

mock.module("../../src/components/ComposerApp.js", () => ({
  createTimestamp: mockCreateTimestamp,
  getCurrentTime: mockGetCurrentTime,
}));

// Mock CLI version to keep snapshots stable across version changes
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0",
}));

import { GitLive } from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";
import { ChatInterface } from "../../src/components/ChatInterface.js";
import { CodeEditor } from "../../src/components/CodeEditor.js";
import { ComposerApp } from "../../src/components/ComposerApp.js";
import { GitWorktreeCreatePrompt } from "../../src/components/GitWorktreeCreatePrompt.js";
import { Layout } from "../../src/components/Layout.js";
import { Sidebar } from "../../src/components/Sidebar.js";
import { TelemetryConsentPrompt } from "../../src/components/TelemetryConsentPrompt.js";
import { GitWorktreeCli } from "../../src/lib/index.js";
import { render } from "../utils.js";

describe("Open Composer CLI", () => {
  describe("GitWorktreeCli", () => {
    test("should initialize with current directory", async () => {
      const cli = await Effect.runPromise(GitWorktreeCli.make());
      expect(cli).toBeInstanceOf(GitWorktreeCli);
    });

    test("should list worktrees", async () => {
      const cli = await Effect.runPromise(GitWorktreeCli.make());
      await expect(
        Effect.runPromise(cli.list().pipe(Effect.provide(GitLive))),
      ).resolves.toBeUndefined();
    });
  });

  describe("Component Snapshots", () => {
    test("ComposerApp renders correctly", () => {
      const { lastFrame } = render(<ComposerApp />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("ChatInterface renders correctly with messages", () => {
      const messages = [
        {
          id: "1",
          content: "Hello, how can I help you?",
          sender: "agent" as const,
          agent: "claude-code",
          timestamp: new Date("2024-01-01T10:00:00"),
        },
        {
          id: "2",
          content: "I need help with my code",
          sender: "user" as const,
          timestamp: new Date("2024-01-01T10:01:00"),
        },
      ];

      const { lastFrame } = render(
        <ChatInterface messages={messages} onSendMessage={() => {}} />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("Sidebar renders correctly with worktrees", () => {
      const worktrees = [
        {
          name: "main",
          path: "/path/to/main",
          branch: "main",
          active: true,
        },
        {
          name: "feature-1",
          path: "/path/to/feature-1",
          branch: "feature-1",
          active: false,
        },
      ];

      const { lastFrame } = render(
        <Sidebar worktrees={worktrees} currentBranch="main" />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("CodeEditor renders correctly with file", () => {
      const { lastFrame } = render(<CodeEditor currentFile="src/index.ts" />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("CodeEditor renders correctly without file", () => {
      const { lastFrame } = render(<CodeEditor />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("Layout renders correctly", () => {
      const { lastFrame } = render(
        <Layout>
          <Text>Test content</Text>
        </Layout>,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("TelemetryConsentPrompt renders correctly", () => {
      const mockOnConsent = mock(() => {});
      const mockOnCancel = mock(() => {});

      const { lastFrame } = render(
        <TelemetryConsentPrompt
          onConsent={mockOnConsent}
          onCancel={mockOnCancel}
        />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("GitWorktreeCreatePrompt renders correctly", () => {
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
});
