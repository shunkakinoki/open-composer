import {
  buildRunner,
  type ComposerCliServices,
  layer,
} from "../commands/composer-command.js";
import type { GitWorktreeCliServices } from "../services/git-worktree-service.js";

export type {
  ComposerCliServices,
  GitWorktreeCliServices,
  GitWorktreeCliServices as WorktreeCliServices,
};

export const cli = buildRunner();
export const CliLive = layer;
