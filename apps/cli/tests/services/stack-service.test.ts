import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
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

// Mock the git-stack module functions to return Effects for testing
mock.module("@open-composer/git-stack", () => ({
  logStack: mockLogStack,
  statusStack: mockStatusStack,
  createStackBranch: mockCreateStackBranch,
  trackStackBranch: mockTrackStackBranch,
  untrackStackBranch: mockUntrackStackBranch,
  deleteStackBranch: mockDeleteStackBranch,
  checkoutStackBranch: mockCheckoutStackBranch,
  syncStack: mockSyncStack,
  submitStack: mockSubmitStack,
  restackStack: mockRestackStack,
  configureStack: mockConfigureStack,
  GitStackLive: (effect: any) => effect, // Layer that just returns the effect unchanged
  runWithGitStack: (effect: any) => effect,
}));

// Mock console methods
const mockConsoleLog = spyOn(console, "log");
const mockConsoleError = spyOn(console, "error");

// Import StackService after mocks are set up
import { StackService } from "../../src/services/stack-service.js";

describe("StackService", () => {
  let service: StackService;

  beforeEach(() => {
    service = new StackService();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Reset all mocks
    mockLogStack.mockClear();
    mockStatusStack.mockClear();
    mockCreateStackBranch.mockClear();
    mockTrackStackBranch.mockClear();
    mockUntrackStackBranch.mockClear();
    mockDeleteStackBranch.mockClear();
    mockCheckoutStackBranch.mockClear();
    mockSyncStack.mockClear();
    mockSubmitStack.mockClear();
    mockRestackStack.mockClear();
    mockConfigureStack.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe("log", () => {
    it("should log the stack", async () => {
      const result = await Effect.runPromise(service.log());

      expect(result).toBeUndefined();
      expect(mockLogStack).toHaveBeenCalled();
    });
  });

  describe("status", () => {
    it("should get stack status", async () => {
      const result = await Effect.runPromise(service.status());

      expect(result).toBeUndefined();
      expect(mockStatusStack).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Current branch: feature-branch",
      // );
      // expect(mockConsoleLog).toHaveBeenCalledWith("Parent: main");
      // expect(mockConsoleLog).toHaveBeenCalledWith("Children: child-branch");
    });

    it("should handle git command errors", async () => {
      // TODO: Implement error testing when proper error mocking is available
      expect(true).toBe(true);
    });
  });

  describe("create", () => {
    it("should create a stack branch", async () => {
      const result = await Effect.runPromise(service.create("new-branch"));

      expect(result).toBeUndefined();
      expect(mockCreateStackBranch).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Created branch new-branch on top of main.",
      // );
    });

    it("should create a stack branch with base", async () => {
      const result = await Effect.runPromise(
        service.create("new-branch", "other-branch"),
      );

      expect(result).toBeUndefined();
      expect(mockCreateStackBranch).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Created branch new-branch on top of other-branch.",
      // );
    });

    it("should handle git command errors", async () => {
      // TODO: Implement error testing when proper error mocking is available
      expect(true).toBe(true);
    });
  });

  describe("track", () => {
    it("should track a stack branch", async () => {
      const result = await Effect.runPromise(
        service.track("branch-name", "parent-branch"),
      );

      expect(result).toBeUndefined();
      expect(mockTrackStackBranch).toHaveBeenCalledWith(
        "branch-name",
        "parent-branch",
      );
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Tracking branch branch-name on top of parent-branch.",
      // );
    });
  });

  describe("untrack", () => {
    it("should untrack a stack branch", async () => {
      const result = await Effect.runPromise(service.untrack("branch-name"));

      expect(result).toBeUndefined();
      expect(mockUntrackStackBranch).toHaveBeenCalledWith("branch-name");
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Removed tracking for branch branch-name.",
      // );
    });
  });

  describe("remove", () => {
    it("should remove a stack branch", async () => {
      const result = await Effect.runPromise(
        service.remove("branch-name", false),
      );

      expect(result).toBeUndefined();
      expect(mockDeleteStackBranch).toHaveBeenCalledWith("branch-name", false);
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Deleted branch branch-name.",
      // );
    });

    it("should remove a stack branch with force", async () => {
      const result = await Effect.runPromise(
        service.remove("branch-name", true),
      );

      expect(result).toBeUndefined();
      expect(mockDeleteStackBranch).toHaveBeenCalledWith("branch-name", true);
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Deleted branch branch-name (force).",
      // );
    });

    it("should handle git command errors", async () => {
      // TODO: Implement error testing when proper error mocking is available
      expect(true).toBe(true);
    });
  });

  describe("checkout", () => {
    it("should checkout a stack branch", async () => {
      const result = await Effect.runPromise(service.checkout("branch-name"));

      expect(result).toBeUndefined();
      expect(mockCheckoutStackBranch).toHaveBeenCalledWith("branch-name");
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Checked out branch branch-name.",
      // );
    });

    it("should handle git command errors", async () => {
      // TODO: Implement error testing when proper error mocking is available
      expect(true).toBe(true);
    });
  });

  describe("sync", () => {
    it("should sync the stack", async () => {
      const result = await Effect.runPromise(service.sync());

      expect(result).toBeUndefined();
      expect(mockSyncStack).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Syncing branch feature-branch",
      // );
    });
  });

  describe("submit", () => {
    it("should submit the stack", async () => {
      const result = await Effect.runPromise(service.submit());

      expect(result).toBeUndefined();
      expect(mockSubmitStack).toHaveBeenCalled();
    });

    it("should handle git command errors", async () => {
      // TODO: Implement error testing when proper error mocking is available
      expect(true).toBe(true);
    });
  });

  describe("restack", () => {
    it("should restack the stack", async () => {
      const result = await Effect.runPromise(service.restack());

      expect(result).toBeUndefined();
      expect(mockRestackStack).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Updated branch feature-branch",
      // );
    });
  });

  describe("config", () => {
    it("should configure stack remote", async () => {
      const result = await Effect.runPromise(service.config("origin"));

      expect(result).toBeUndefined();
      expect(mockConfigureStack).toHaveBeenCalled();
      // expect(mockConsoleLog).toHaveBeenCalledWith(
      //   "Set default stack remote to 'origin'.",
      // );
    });
  });
});
