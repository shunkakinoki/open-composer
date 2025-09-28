import type { ExecFileOptions } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as Effect from "effect/Effect";

const execFileAsync = promisify(execFile);

export interface GitHubCommandOptions
  extends Pick<ExecFileOptions, "cwd" | "env"> {
  readonly maxBuffer?: number;
}

export interface GitHubCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface GitHubCommandError {
  readonly _tag: "GitHubCommandError";
  readonly message: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string | undefined;
  readonly stderr?: string | undefined;
  readonly stdout?: string | undefined;
  readonly exitCode?: number | null;
  readonly signal?: NodeJS.Signals | null;
  readonly cause: unknown;
}

const makeGitHubCommandError = (params: {
  readonly args: ReadonlyArray<string>;
  readonly options: GitHubCommandOptions | undefined;
  readonly cause: unknown;
}): GitHubCommandError => {
  const { args, options, cause } = params;
  const error = cause as NodeJS.ErrnoException & {
    readonly stderr?: string;
    readonly stdout?: string;
    readonly code?: number | string;
    readonly signal?: NodeJS.Signals;
  };

  return {
    _tag: "GitHubCommandError",
    message: `gh ${args.join(" ")} failed`,
    args,
    cwd: options?.cwd
      ? typeof options.cwd === "string"
        ? options.cwd
        : undefined
      : undefined,
    stderr: error.stderr,
    stdout: error.stdout,
    exitCode: typeof error.code === "number" ? error.code : null,
    signal: error.signal || null,
    cause,
  };
};

export const run = (
  args: ReadonlyArray<string>,
  options?: GitHubCommandOptions,
): Effect.Effect<GitHubCommandResult, GitHubCommandError> =>
  Effect.tryPromise({
    try: () =>
      execFileAsync("gh", args, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        ...options,
      }),
    catch: (cause) => makeGitHubCommandError({ args, options, cause }),
  });
