// Core git functionality

// High-level git commands
export {
  add,
  checkout,
  checkoutNewBranch,
  commit,
  deleteBranch,
  diff,
  getCurrentBranch,
  getLastCommitMessage,
  log,
  merge,
  pull,
  push,
  rebase,
  reset,
  stash,
  stashPop,
  status,
  tag,
} from "./commands.js";
export type {
  GitCommandError,
  GitCommandOptions,
  GitCommandResult,
  GitService,
} from "./core.js";
export { Git, GitLive, run } from "./core.js";
