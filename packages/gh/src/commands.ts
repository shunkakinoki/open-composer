import type * as Effect from "effect/Effect";
import { type GitHubCommandError, type GitHubCommandResult, run } from "./core.js";

// Authentication and setup commands
export const authStatus: Effect.Effect<GitHubCommandResult, GitHubCommandError> = run([
  "auth",
  "status",
]);

export const authLogin: Effect.Effect<GitHubCommandResult, GitHubCommandError> = run([
  "auth",
  "login",
]);

// Repository commands
export const repoView = (options?: {
  readonly json?: string;
  readonly jq?: string;
}): Effect.Effect<GitHubCommandResult, GitHubCommandError> => {
  const args = ["repo", "view"];
  if (options?.json) {
    args.push("--json", options.json);
  }
  if (options?.jq) {
    args.push("--jq", options.jq);
  }
  return run(args);
};

export const repoList = (options?: {
  readonly owner?: string;
  readonly limit?: number;
  readonly json?: boolean;
}): Effect.Effect<GitHubCommandResult, GitHubCommandError> => {
  const args = ["repo", "list"];
  if (options?.owner) {
    args.push(options.owner);
  }
  if (options?.limit) {
    args.push("--limit", options.limit.toString());
  }
  if (options?.json) {
    args.push("--json");
  }
  return run(args);
};

// Generic command executor for custom commands
export const exec = (
  args: ReadonlyArray<string>,
  options?: { readonly cwd?: string; readonly env?: Record<string, string> },
): Effect.Effect<GitHubCommandResult, GitHubCommandError> => run(args, options);
