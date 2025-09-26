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

import { GitLive } from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";
import { ChatInterface } from "../../src/components/ChatInterface.js";
import { CodeEditor } from "../../src/components/CodeEditor.js";
import { ComposerApp } from "../../src/components/ComposerApp.js";
import { Layout } from "../../src/components/Layout.js";
import { Sidebar } from "../../src/components/Sidebar.js";
import { AgentRouter, WorktreeCli } from "../../src/lib/index.js";
import { render } from "../utils.js";

describe("Open Composer CLI", () => {
  describe("AgentRouter", () => {
    test("should initialize with default agents", () => {
      const router = new AgentRouter();
      const agents = router.getAgents();

      expect(agents).toHaveLength(5);
      expect(agents.find((a) => a.name === "claude-code")).toBeDefined();
      expect(agents.find((a) => a.name === "codex-nation")).toBeDefined();
    });

    test("should activate and deactivate agents", () => {
      const router = new AgentRouter();

      expect(router.activateAgent("codex-nation")).toBe(true);
      expect(router.deactivateAgent("claude-code")).toBe(true);

      const activeAgents = router.getActiveAgents();
      expect(activeAgents.find((a) => a.name === "codex-nation")).toBeDefined();
      expect(
        activeAgents.find((a) => a.name === "claude-code"),
      ).toBeUndefined();
    });

    test("should route queries to appropriate agents", async () => {
      const router = new AgentRouter();

      const reviewResponse = await router.routeQuery("review this code");
      expect(reviewResponse.agent).toBe("claude-code");

      const generateResponse = await router.routeQuery("generate a function");
      expect(generateResponse.agent).toBe("codex-nation");
    });
  });

  describe("WorktreeCli", () => {
    test("should initialize with current directory", async () => {
      const cli = await Effect.runPromise(WorktreeCli.make());
      expect(cli).toBeInstanceOf(WorktreeCli);
    });

    test("should list worktrees", async () => {
      const cli = await Effect.runPromise(WorktreeCli.make());
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
  });
});
