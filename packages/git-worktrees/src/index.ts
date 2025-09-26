// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

// Errors
export type {
  GitWorktreeError,
  GitWorktreeNotFoundError,
  GitWorktreeParseError,
} from "./errors.js";
export {
  parseError,
  worktreeNotFoundError,
} from "./errors.js";
// Git
export type {
  GitCommandError,
  GitCommandOptions,
  GitCommandResult,
  GitService,
} from "./git.js";
export { Git, GitLive, run as runGit } from "./git.js";
// Worktrees
export type {
  AddOptions,
  GitWorktreesError,
  ListOptions,
  LockOptions,
  MoveOptions,
  PruneOptions,
  RemoveOptions,
  UnlockOptions,
  Worktree,
} from "./worktrees.js";
export {
  add,
  list,
  lock,
  move,
  prune,
  remove,
  unlock,
} from "./worktrees.js";
