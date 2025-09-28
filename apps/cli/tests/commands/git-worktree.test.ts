import { describe, expect, it } from "bun:test";
import { buildGitWorktreeCommand } from "../../src/commands/git-worktree-command.js";

describe("git-worktree command", () => {
  it("should build git-worktree command successfully", () => {
    const command = buildGitWorktreeCommand();
    expect(command).toBeDefined();
    expect(typeof command).toBe("object");
  });
});
