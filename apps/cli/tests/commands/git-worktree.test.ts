import { describe, expect, test } from "bun:test";
import { buildGitWorktreeCommand } from "../../src/commands/git-worktree-command.js";

describe.concurrent("git-worktree command", () => {
  test.concurrent("should build git-worktree command successfully", () => {
    const command = buildGitWorktreeCommand();
    expect(command).toBeDefined();
    expect(typeof command).toBe("object");
  });
});
