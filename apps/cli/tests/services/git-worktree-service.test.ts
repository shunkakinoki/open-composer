import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import type {
  AddOptions,
  ListOptions,
  MoveOptions,
  PruneOptions,
  Worktree,
} from "@open-composer/git-worktrees";
import { GitLive } from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";
import type * as Exit from "effect/Exit";
import {
  type CreateGitWorktreeOptions,
  type EditGitWorktreeOptions,
  GitWorktreeService,
  type PruneGitWorktreeOptions,
} from "../../src/services/git-worktree-service.js";

// Mock the git-worktrees package
const mockAddWorktree = mock((options: AddOptions) =>
  Effect.succeed({
    path: options.path || "/tmp/test-worktree",
    branch: options.branch?.name || "main",
    bare: false,
    detached: !options.branch,
    locked: undefined,
    prunable: undefined,
  } as Worktree),
);

const mockListWorktrees = mock((_options: ListOptions) =>
  Effect.succeed([
    {
      path: "/path/to/repo",
      branch: "main",
      bare: false,
      detached: false,
      locked: undefined,
      prunable: undefined,
    },
    {
      path: "/path/to/feature-worktree",
      branch: "feature-branch",
      bare: false,
      detached: false,
      locked: undefined,
      prunable: undefined,
    },
    {
      path: "/path/to/prunable-worktree",
      branch: "old-branch",
      bare: false,
      detached: false,
      locked: undefined,
      prunable: { reason: "gone" },
    },
  ] as Worktree[]),
);

const mockMoveWorktree = mock((options: MoveOptions) =>
  Effect.succeed({
    path: options.to,
    branch: "moved-branch",
    bare: false,
    detached: false,
    locked: undefined,
    prunable: undefined,
  } as Worktree),
);

const mockPruneWorktrees = mock((_options: PruneOptions) => Effect.void);

mock.module("@open-composer/git-worktrees", () => ({
  add: mockAddWorktree,
  list: mockListWorktrees,
  move: mockMoveWorktree,
  prune: mockPruneWorktrees,
  type: {
    GitService: {},
    Worktree: {},
  },
}));

// Mock Effect and console
const mockConsoleLog = spyOn(console, "log");

describe("GitWorktreeService", () => {
  let service: GitWorktreeService;

  beforeEach(() => {
    service = new GitWorktreeService("/test/repo");
    mockConsoleLog.mockClear();
    mockAddWorktree.mockClear();
    mockListWorktrees.mockClear();
    mockMoveWorktree.mockClear();
    mockPruneWorktrees.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("list", () => {
    it("should list git worktrees", async () => {
      const result = await Effect.runPromise(
        service.list().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockListWorktrees).toHaveBeenCalledWith({ cwd: "/test/repo" });
      expect(mockConsoleLog).toHaveBeenCalledWith("Git worktrees:");
      expect(mockConsoleLog).toHaveBeenCalledWith("  main  /path/to/repo");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "  feature-branch  /path/to/feature-worktree",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "  old-branch  /path/to/prunable-worktree  [prunable: gone]",
      );
    });

    it("should handle empty worktree list", async () => {
      mockListWorktrees.mockReturnValueOnce(Effect.succeed([]));

      const result = await Effect.runPromise(
        service.list().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith("No git worktrees found.");
    });
  });

  describe("create", () => {
    it("should create a worktree with branch", async () => {
      const options: CreateGitWorktreeOptions = {
        path: "/tmp/new-worktree",
        branch: "new-feature",
        force: false,
        detach: false,
        checkout: true,
        branchForce: false,
      };

      const result = await Effect.runPromise(
        service.create(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockAddWorktree).toHaveBeenCalledWith({
        cwd: "/test/repo",
        path: "/tmp/new-worktree",
        ref: undefined,
        branch: {
          name: "new-feature",
          force: false,
        },
        force: false,
        detach: false,
        checkout: true,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Created worktree at /tmp/new-worktree tracking new-feature.",
      );
    });

    it("should create a worktree with ref", async () => {
      const options: CreateGitWorktreeOptions = {
        path: "/tmp/new-worktree",
        ref: "v1.0.0",
        force: false,
        detach: false,
        checkout: true,
        branchForce: false,
      };

      const result = await Effect.runPromise(
        service.create(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockAddWorktree).toHaveBeenCalledWith({
        cwd: "/test/repo",
        path: "/tmp/new-worktree",
        ref: "v1.0.0",
        branch: undefined,
        force: false,
        detach: false,
        checkout: true,
      });
    });

    it("should create a detached worktree", async () => {
      const options: CreateGitWorktreeOptions = {
        path: "/tmp/new-worktree",
        force: false,
        detach: true,
        checkout: true,
        branchForce: false,
      };

      const result = await Effect.runPromise(
        service.create(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockAddWorktree).toHaveBeenCalledWith({
        cwd: "/test/repo",
        path: "/tmp/new-worktree",
        ref: undefined,
        branch: undefined,
        force: false,
        detach: true,
        checkout: true,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Created worktree at /tmp/new-worktree tracking detached.",
      );
    });
  });

  describe("edit", () => {
    it("should move a worktree", async () => {
      const options: EditGitWorktreeOptions = {
        from: "/old/path",
        to: "/new/path",
        force: false,
      };

      const result = await Effect.runPromise(
        service.edit(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockMoveWorktree).toHaveBeenCalledWith({
        cwd: "/test/repo",
        from: "/old/path",
        to: "/new/path",
        force: false,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Moved worktree to /new/path tracking moved-branch.",
      );
    });
  });

  describe("prune", () => {
    it("should prune worktrees in dry-run mode", async () => {
      const options: PruneGitWorktreeOptions = {
        dryRun: true,
        verbose: false,
        expire: "1.day.ago",
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockListWorktrees).toHaveBeenCalledWith({ cwd: "/test/repo" });
      expect(mockPruneWorktrees).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("Would prune 1 worktree(s):");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "  • /path/to/prunable-worktree",
      );
    });

    it("should show message when no prunable worktrees in dry-run", async () => {
      mockListWorktrees.mockReturnValueOnce(
        Effect.succeed([
          {
            path: "/path/to/repo",
            branch: "main",
            bare: false,
            detached: false,
            locked: undefined,
            prunable: undefined,
          },
        ]),
      );

      const options: PruneGitWorktreeOptions = {
        dryRun: true,
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "No prunable worktrees found.",
      );
    });

    it("should actually prune worktrees", async () => {
      const options: PruneGitWorktreeOptions = {
        dryRun: false,
        verbose: true,
        expire: "1.week.ago",
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockListWorktrees).toHaveBeenCalledTimes(2); // Once before, once after
      expect(mockPruneWorktrees).toHaveBeenCalledWith({
        cwd: "/test/repo",
        dryRun: false,
        verbose: true,
        expire: "1.week.ago",
      });
      expect(mockConsoleLog).toHaveBeenCalledWith("Pruned 3 worktree(s):");
    });

    it("should handle no worktrees pruned", async () => {
      // Same worktrees before and after (none removed)
      const options: PruneGitWorktreeOptions = {
        dryRun: false,
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith("No worktrees were pruned.");
    });
  });

  describe("switch", () => {
    it("should switch to a worktree", async () => {
      const result = await Effect.runPromise(
        service
          .switch("/path/to/feature-worktree")
          .pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockListWorktrees).toHaveBeenCalledWith({ cwd: "/test/repo" });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Switching to worktree: /path/to/feature-worktree",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("Tracking: feature-branch");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "To switch to this worktree, run: cd /path/to/feature-worktree",
      );
    });

    it("should switch to detached worktree", async () => {
      mockListWorktrees.mockReturnValueOnce(
        Effect.succeed([
          {
            path: "/path/to/detached-worktree",
            branch: "detached-branch",
            bare: false,
            detached: true,
            locked: undefined,
            prunable: undefined,
          },
        ]),
      );

      const result = await Effect.runPromise(
        service
          .switch("/path/to/detached-worktree")
          .pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith("Tracking: detached-branch");
    });

    it("should fail when worktree not found", async () => {
      const result = await Effect.runPromiseExit(
        service.switch("/nonexistent/path").pipe(Effect.provide(GitLive)),
      );

      expect(result._tag).toBe("Failure");
      expect((result as Exit.Failure<unknown, Error>).cause._tag).toBe("Fail");
      expect(
        (
          (result as Exit.Failure<unknown, Error>).cause as {
            _tag: "Fail";
            error: Error;
          }
        ).error.message,
      ).toBe("Worktree not found: /nonexistent/path");
    });
  });

  describe("static make", () => {
    it("should create a service instance", () => {
      const result = Effect.runSync(
        GitWorktreeService.make().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeInstanceOf(GitWorktreeService);
    });
  });
});
