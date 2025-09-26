export interface GitWorktreeParseError {
  readonly _tag: "GitWorktreeParseError";
  readonly message: string;
  readonly stdout: string;
  readonly cause: unknown;
}

export const parseError = (params: {
  readonly stdout: string;
  readonly cause: unknown;
}): GitWorktreeParseError => ({
  _tag: "GitWorktreeParseError",
  message: "Failed to parse git worktree porcelain output",
  stdout: params.stdout,
  cause: params.cause,
});

export interface GitWorktreeNotFoundError {
  readonly _tag: "GitWorktreeNotFoundError";
  readonly message: string;
  readonly path: string;
}

export const worktreeNotFoundError = (
  path: string,
): GitWorktreeNotFoundError => ({
  _tag: "GitWorktreeNotFoundError",
  message: `Worktree not found for path: ${path}`,
  path,
});

export type GitWorktreeError = GitWorktreeParseError | GitWorktreeNotFoundError;
