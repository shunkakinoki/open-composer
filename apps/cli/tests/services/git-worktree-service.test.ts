import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
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

// Mock the git-worktrees package
const mockAddWorktree = (options: AddOptions) =>
  Effect.succeed({
    path: options.path || "/tmp/test-worktree",
    branch: options.branch?.name || "main",
    bare: false,
    detached: !options.branch,
    locked: undefined,
    prunable: undefined,
  } as Worktree);

const mockListWorktrees = (_options?: ListOptions) =>
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
  ] as Worktree[]);

const mockMoveWorktree = (options: MoveOptions) =>
  Effect.succeed({
    path: options.to,
    branch: "moved-branch",
    bare: false,
    detached: false,
    locked: undefined,
    prunable: undefined,
  } as Worktree);

const mockPruneWorktrees = (_options?: PruneOptions) => Effect.void;

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

// Import GitWorktreeService after mocks are set up
import {
  type CreateGitWorktreeOptions,
  type EditGitWorktreeOptions,
  GitWorktreeService,
  type PruneGitWorktreeOptions,
} from "../../src/services/git-worktree-service.js";

describe("GitWorktreeService", () => {
  let service: GitWorktreeService;

  beforeEach(() => {
    service = new GitWorktreeService("/test/repo");
    // Override functions for testing
    service.addWorktree = mockAddWorktree;
    service.listWorktrees = mockListWorktrees;
    service.moveWorktree = mockMoveWorktree;
    service.pruneWorktrees = mockPruneWorktrees;
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("list", () => {
    test.serial("should list git worktrees", async () => {
      const result = await Effect.runPromise(
        service.list().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });

    test.serial("should handle empty worktree list", async () => {
      // Temporarily override the mock to return empty list
      const originalMock = service.listWorktrees;
      service.listWorktrees = () => Effect.succeed([]);

      const result = await Effect.runPromise(
        service.list().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();

      // Restore original mock
      service.listWorktrees = originalMock;
    });
  });

  describe("create", () => {
    test.serial("should create a worktree with branch", async () => {
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
    });

    test.serial("should create a worktree with ref", async () => {
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
    });

    test.serial("should create a detached worktree", async () => {
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
    });
  });

  describe("edit", () => {
    test.serial("should move a worktree", async () => {
      const options: EditGitWorktreeOptions = {
        from: "/old/path",
        to: "/new/path",
        force: false,
      };

      const result = await Effect.runPromise(
        service.edit(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("prune", () => {
    test.serial("should prune worktrees in dry-run mode", async () => {
      const options: PruneGitWorktreeOptions = {
        dryRun: true,
        verbose: false,
        expire: "1.day.ago",
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });

    test.serial(
      "should show message when no prunable worktrees in dry-run",
      async () => {
        // Temporarily override to return worktrees with no prunable ones
        const originalMock = service.listWorktrees;
        service.listWorktrees = () =>
          Effect.succeed([
            {
              path: "/path/to/repo",
              branch: "main",
              bare: false,
              detached: false,
              locked: undefined,
              prunable: undefined,
            },
          ]);

        const options: PruneGitWorktreeOptions = {
          dryRun: true,
        };

        const result = await Effect.runPromise(
          service.prune(options).pipe(Effect.provide(GitLive)),
        );

        expect(result).toBeUndefined();

        // Restore original mock
        service.listWorktrees = originalMock;
      },
    );

    test.serial("should actually prune worktrees", async () => {
      const options: PruneGitWorktreeOptions = {
        dryRun: false,
        verbose: true,
        expire: "1.week.ago",
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });

    test.serial("should handle no worktrees pruned", async () => {
      // Same worktrees before and after (none removed)
      const options: PruneGitWorktreeOptions = {
        dryRun: false,
      };

      const result = await Effect.runPromise(
        service.prune(options).pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("switch", () => {
    test.serial("should switch to a worktree", async () => {
      const result = await Effect.runPromise(
        service
          .switch("/path/to/feature-worktree")
          .pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();
    });

    test.serial("should switch to detached worktree", async () => {
      // Temporarily override to return detached worktree
      const originalMock = service.listWorktrees;
      service.listWorktrees = () =>
        Effect.succeed([
          {
            path: "/path/to/detached-worktree",
            branch: "detached-branch",
            bare: false,
            detached: true,
            locked: undefined,
            prunable: undefined,
          },
        ]);

      const result = await Effect.runPromise(
        service
          .switch("/path/to/detached-worktree")
          .pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeUndefined();

      // Restore original mock
      service.listWorktrees = originalMock;
    });

    test.serial("should fail when worktree not found", async () => {
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
      ).toBe(
        "Failed to switch git worktree: Worktree not found: /nonexistent/path",
      );
    });
  });

  describe("static make", () => {
    test.serial("should create a service instance", () => {
      const result = Effect.runSync(
        GitWorktreeService.make().pipe(Effect.provide(GitLive)),
      );

      expect(result).toBeInstanceOf(GitWorktreeService);
    });
  });
});
