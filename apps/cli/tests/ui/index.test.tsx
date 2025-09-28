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
import { GitWorktreeSwitchPrompt } from "../../src/components/GitWorktreeSwitchPrompt.js";
import { Layout } from "../../src/components/Layout.js";
import { Sidebar } from "../../src/components/Sidebar.js";
import { TelemetryConsentPrompt } from "../../src/components/TelemetryConsentPrompt.js";
import { GitWorktreeCli } from "../../src/lib/index.js";
import { render } from "../utils.js";

describe("Open Composer CLI", () => {
  describe("GitWorktreeCli", () => {
    test("should initialize with current directory", async () => {
      const cli = await Effect.runPromise(
        GitWorktreeCli.make().pipe(Effect.provide(GitLive)),
      );
      expect(cli).toBeInstanceOf(GitWorktreeCli);
    });

    test("should list worktrees", async () => {
      const cli = await Effect.runPromise(
        GitWorktreeCli.make().pipe(Effect.provide(GitLive)),
      );
      await expect(
        Effect.runPromise(cli.list().pipe(Effect.provide(GitLive))),
      ).resolves.toBeUndefined();
    });
  });

  describe("Component Snapshots", () => {
    test("ComposerApp renders correctly", async () => {
      const { lastFrame } = await render(<ComposerApp />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("ChatInterface renders correctly with messages", async () => {
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

      const { lastFrame } = await render(
        <ChatInterface messages={messages} onSendMessage={() => {}} />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("Sidebar renders correctly with worktrees", async () => {
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

      const { lastFrame } = await render(
        <Sidebar worktrees={worktrees} currentBranch="main" />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("CodeEditor renders correctly with file", async () => {
      const { lastFrame } = await render(<CodeEditor currentFile="src/index.ts" />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("CodeEditor renders correctly without file", async () => {
      const { lastFrame } = await render(<CodeEditor />);
      expect(lastFrame()).toMatchSnapshot();
    });

    test("Layout renders correctly", async () => {
      const { lastFrame } = await render(
        <Layout>
          <Text>Test content</Text>
        </Layout>,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("TelemetryConsentPrompt renders correctly", async () => {
      const mockOnConsent = mock(() => {});
      const mockOnCancel = mock(() => {});

      const { lastFrame } = await render(
        <TelemetryConsentPrompt
          onConsent={mockOnConsent}
          onCancel={mockOnCancel}
        />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("GitWorktreeCreatePrompt renders correctly", async () => {
      const mockOnSubmit = mock(() => {});
      const mockOnCancel = mock(() => {});

      const { lastFrame } = await render(
        <GitWorktreeCreatePrompt
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("GitWorktreeSwitchPrompt renders correctly with worktrees", async () => {
      const mockOnSubmit = mock(() => {});
      const mockOnCancel = mock(() => {});

      const worktrees = [
        {
          path: "/path/to/main",
          branch: "main",
          bare: false,
          detached: false,
        },
        {
          path: "/path/to/feature-1",
          branch: "feature-1",
          bare: false,
          detached: false,
        },
        {
          path: "/path/to/feature-2",
          branch: "feature-2",
          bare: false,
          detached: false,
          locked: { reason: "in use" },
        },
      ];

      const { lastFrame } = await render(
        <GitWorktreeSwitchPrompt
          worktrees={worktrees}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test("GitWorktreeSwitchPrompt renders correctly with no worktrees", async () => {
      const mockOnSubmit = mock(() => {});
      const mockOnCancel = mock(() => {});

      const { lastFrame } = await render(
        <GitWorktreeSwitchPrompt
          worktrees={[]}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
