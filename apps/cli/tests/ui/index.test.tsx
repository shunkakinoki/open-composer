import { describe, expect, test } from "bun:test";

import { GitLive } from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";
import { GitWorktreeCli } from "../../src/lib/index.js";

describe("Open Composer CLI", () => {
  describe("GitWorktreeCli", () => {
    test("should initialize with current directory", async () => {
      // @ts-expect-error - Effect.runPromise expects no services but GitWorktreeCli.make requires GitService
      const cli = await Effect.runPromise(GitWorktreeCli.make());
      expect(cli).toBeInstanceOf(GitWorktreeCli);
    });

    test("should list worktrees", async () => {
      // @ts-expect-error - Effect.runPromise expects no services but GitWorktreeCli.make requires GitService
      const cli = await Effect.runPromise(GitWorktreeCli.make());
      await expect(
        Effect.runPromise(cli.list().pipe(Effect.provide(GitLive))),
      ).resolves.toBeUndefined();
    });
  });
});
