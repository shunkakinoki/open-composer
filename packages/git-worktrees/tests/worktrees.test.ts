import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import { add, list, lock, move, remove } from "../src/worktrees.js";
import { createGitStub, success } from "./utils.js";

describe.concurrent("git worktrees", () => {
  test.concurrent("parses porcelain worktree listings", async () => {
    const porcelain = [
      "worktree /repo/main",
      "HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "branch refs/heads/main",
      "",
      "worktree /repo/feature/foo",
      "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "detached",
      "locked stale checkout",
      "prunable manual prune",
      "",
    ].join("\n");

    const stub = createGitStub([success(porcelain)]);

    const result = await Effect.runPromise(stub.provide(list()));

    expect(stub.calls[0]?.args).toEqual(["worktree", "list", "--porcelain"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      path: "/repo/main",
      head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      branch: "main",
      bare: false,
      detached: false,
    });
    expect(result[1]).toMatchObject({
      path: "/repo/feature/foo",
      detached: true,
      locked: { reason: "stale checkout" },
      prunable: { reason: "manual prune" },
    });
  });

  test.concurrent("creates worktrees with branching and locking", async () => {
    const porcelain = [
      "worktree /repo/main",
      "HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "branch refs/heads/main",
      "",
      "worktree /repo/feature/foo",
      "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "branch refs/heads/feature/foo",
      "locked CI validated",
      "",
    ].join("\n");

    const stub = createGitStub([success(""), success(porcelain)]);

    const worktree = await Effect.runPromise(
      stub.provide(
        add({
          cwd: "/repo",
          path: "feature/foo",
          ref: "origin/main",
          branch: { name: "feature/foo" },
          checkout: false,
          lock: { reason: "CI validated" },
        }),
      ),
    );

    expect(stub.calls[0]?.args).toEqual([
      "worktree",
      "add",
      "--no-checkout",
      "--lock",
      "--reason",
      "CI validated",
      "-b",
      "feature/foo",
      "--",
      "feature/foo",
      "origin/main",
    ]);

    expect(worktree).toMatchObject({
      path: "/repo/feature/foo",
      branch: "feature/foo",
      locked: { reason: "CI validated" },
    });
  });

  test.concurrent("propagates not-found errors after move", async () => {
    const stub = createGitStub([
      success(""),
      success("worktree /repo/main\n\n"),
    ]);

    const result = await Effect.runPromise(
      stub.provide(
        Effect.either(
          move({ cwd: "/repo", from: "feature/foo", to: "feature/bar" }),
        ),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toMatchObject({
        _tag: "GitWorktreeNotFoundError",
        path: path.normalize("/repo/feature/bar"),
      });
    } else {
      throw new Error("expected failure when worktree is missing");
    }
  });

  test.concurrent("removes worktrees", async () => {
    const stub = createGitStub([success("")]);

    await Effect.runPromise(
      stub.provide(remove({ cwd: "/repo", path: "feature/foo", force: true })),
    );

    expect(stub.calls[0]?.args).toEqual([
      "worktree",
      "remove",
      "--force",
      "feature/foo",
    ]);
  });

  test.concurrent("locks worktrees with reasons", async () => {
    const porcelain = [
      "worktree /repo/feature/foo",
      "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "branch refs/heads/feature/foo",
      "locked investigate",
      "",
    ].join("\n");

    const stub = createGitStub([success(""), success(porcelain)]);

    const result = await Effect.runPromise(
      stub.provide(
        lock({ cwd: "/repo", path: "feature/foo", reason: "investigate" }),
      ),
    );

    expect(stub.calls[0]?.args).toEqual([
      "worktree",
      "lock",
      "feature/foo",
      "--reason",
      "investigate",
    ]);

    expect(result.locked?.reason).toBe("investigate");
  });
});
