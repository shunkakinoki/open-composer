import * as Effect from "effect/Effect";
import type {
  GitCommandError,
  GitCommandOptions,
  GitCommandResult,
} from "./core.js";
import { run } from "./core.js";

export const getCurrentBranch = (
  options?: GitCommandOptions,
): Effect.Effect<string, GitCommandError> =>
  run(["rev-parse", "--abbrev-ref", "HEAD"], options).pipe(
    Effect.map(({ stdout }) => stdout.trim()),
  );

export const checkout = (
  branch: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["checkout", branch], options);

export const checkoutNewBranch = (
  name: string,
  base?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = base ? ["checkout", "-b", name, base] : ["checkout", "-b", name];
  return run(args, options);
};

export const deleteBranch = (
  branch: string,
  force = false,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = ["branch", force ? "-D" : "-d", branch];
  return run(args, options);
};

export const getLastCommitMessage = (
  branch?: string,
  options?: GitCommandOptions,
): Effect.Effect<string, GitCommandError> => {
  const args = branch
    ? ["show", "-s", "--format=%s", branch]
    : ["show", "-s", "--format=%s"];
  return run(args, options).pipe(Effect.map(({ stdout }) => stdout.trim()));
};

export const status = (
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["status", "--porcelain"], options);

export const diff = (
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => run(["diff"], options);

export const log = (
  maxCount?: number,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = maxCount
    ? ["log", `--max-count=${maxCount}`, "--oneline"]
    : ["log", "--oneline"];
  return run(args, options);
};

export const add = (
  paths: ReadonlyArray<string>,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["add", ...paths], options);

export const commit = (
  message: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["commit", "-m", message], options);

export const push = (
  remote?: string,
  branch?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = ["push"];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  return run(args, options);
};

export const pull = (
  remote?: string,
  branch?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = ["pull"];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  return run(args, options);
};

export const merge = (
  branch: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["merge", branch], options);

export const rebase = (
  onto: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["rebase", onto], options);

export const stash = (
  message?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = message ? ["stash", "push", "-m", message] : ["stash"];
  return run(args, options);
};

export const stashPop = (
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  run(["stash", "pop"], options);

export const reset = (
  mode: "soft" | "mixed" | "hard",
  commit?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = [`--${mode}`];
  if (commit) args.push(commit);
  return run(["reset", ...args], options);
};

export const tag = (
  name: string,
  message?: string,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> => {
  const args = message ? ["tag", "-a", name, "-m", message] : ["tag", name];
  return run(args, options);
};
