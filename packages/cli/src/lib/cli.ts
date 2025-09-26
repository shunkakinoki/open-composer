import {
  buildRunner,
  type ComposerCliServices,
  layer,
} from "../commands/composer.js";
import {
  GitWorktreeCli,
  type GitWorktreeCliServices,
} from "../services/git-worktree-cli.js";

// Export both old and new names for backward compatibility
export { GitWorktreeCli, GitWorktreeCli as WorktreeCli };
export type { ComposerCliServices, GitWorktreeCliServices, GitWorktreeCliServices as WorktreeCliServices };

export const cli = buildRunner();
export const CliLive = layer;
