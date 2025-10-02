import { describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";

// Mock the git-stack package functions
const mockLogStack = mock(() =>
  Effect.succeed(["branch-1: Commit message 1", "branch-2: Commit message 2"]),
);

const mockStatusStack = mock(() =>
  Effect.succeed({
    currentBranch: "feature-branch",
    parent: "main",
    children: ["child-branch"],
  }),
);

const mockCreateStackBranch = mock((options: unknown) =>
  Effect.succeed({
    branch: (options as { name: string }).name,
    base: (options as { base?: string }).base || "main",
  }),
);

const mockTrackStackBranch = mock(() => Effect.void);

const mockUntrackStackBranch = mock(() => Effect.void);

const mockDeleteStackBranch = mock(() => Effect.void);

const mockCheckoutStackBranch = mock(() => Effect.void);

const mockSyncStack = mock(() =>
  Effect.succeed(["Syncing branch feature-branch", "Pushing to origin"]),
);

const mockSubmitStack = mock(() =>
  Effect.succeed(["Submitting stack to GitHub", "Created PR #123"]),
);

const mockRestackStack = mock(() =>
  Effect.succeed(["Restacking branches", "Updated branch feature-branch"]),
);

const mockConfigureStack = mock(() => Effect.void);

// TODO: Add MockGitCommandError when implementing error testing

// Mock console methods could be added here if needed for future tests

// Import StackService after mocks are set up
import { StackService } from "../../src/services/stack-service.js";

describe.concurrent("StackService", () => {
  describe.concurrent("service instantiation", () => {
    test.concurrent("should handle default constructor", () => {
      const defaultService = new StackService();
      expect(defaultService).toBeInstanceOf(StackService);
    });

    test.concurrent("should create service with dependencies", () => {
      const service = new StackService(
        mockLogStack,
        mockStatusStack,
        mockCreateStackBranch,
        mockTrackStackBranch,
        mockUntrackStackBranch,
        mockDeleteStackBranch,
        mockCheckoutStackBranch,
        mockSyncStack,
        mockSubmitStack,
        mockRestackStack,
        mockConfigureStack,
      );
      expect(service).toBeInstanceOf(StackService);
    });
  });
});
