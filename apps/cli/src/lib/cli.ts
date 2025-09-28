import {
  buildRunner,
  type ComposerCliServices,
  layer,
} from "../commands/composer-command.js";
import {
  type GitWorktreeCliServices,
  GitWorktreeService,
} from "../services/git-worktree-service.js";

// Export both old and new names for backward compatibility
export {
  GitWorktreeService as GitWorktreeCli,
  GitWorktreeService as WorktreeCli,
};
export type {
  ComposerCliServices,
  GitWorktreeCliServices,
  GitWorktreeCliServices as WorktreeCliServices,
};

export const cli = buildRunner();
export const CliLive = layer;
