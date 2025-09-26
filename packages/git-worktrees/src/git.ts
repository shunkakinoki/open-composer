import type { ExecFileOptions } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// -----------------------------------------------------------------------------
// Git
// -----------------------------------------------------------------------------

const execFileAsync = promisify(execFile);

export interface GitCommandOptions
  extends Pick<ExecFileOptions, "cwd" | "env"> {
  readonly maxBuffer?: number;
}

export interface GitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface GitCommandError {
  readonly _tag: "GitCommandError";
  readonly message: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string | undefined;
  readonly stderr?: string | undefined;
  readonly stdout?: string | undefined;
  readonly exitCode?: number | null;
  readonly signal?: NodeJS.Signals | null;
  readonly cause: unknown;
}

const makeGitCommandError = (params: {
  readonly args: ReadonlyArray<string>;
  readonly options: GitCommandOptions | undefined;
  readonly cause: unknown;
}): GitCommandError => {
  const { args, options, cause } = params;
  const error = cause as NodeJS.ErrnoException & {
    readonly stderr?: string;
    readonly stdout?: string;
    readonly code?: number | string;
    readonly signal?: NodeJS.Signals;
  };

  return {
    _tag: "GitCommandError",
    message: `git ${args.join(" ")} failed`,
    args,
    cwd: options?.cwd
      ? typeof options.cwd === "string"
        ? options.cwd
        : options.cwd.pathname
      : undefined,
    stderr: error.stderr,
    stdout: error.stdout,
    exitCode: typeof error.code === "number" ? error.code : null,
    signal: error.signal ?? null,
    cause,
  } satisfies GitCommandError;
};

export interface GitService {
  readonly run: (
    args: ReadonlyArray<string>,
    options?: GitCommandOptions,
  ) => Effect.Effect<GitCommandResult, GitCommandError>;
}

export const Git = Context.GenericTag<GitService>("git-worktrees/Git");

export const GitLive = Layer.effect(
  Git,
  Effect.sync(() => {
    const run: GitService["run"] = (args, options) =>
      Effect.tryPromise({
        try: async () => {
          const result = await execFileAsync("git", args, {
            cwd: options?.cwd,
            env: options?.env,
            encoding: "utf8",
            maxBuffer: options?.maxBuffer ?? 1024 * 1024 * 10,
          });
          return {
            stdout: result.stdout,
            stderr: result.stderr,
          } satisfies GitCommandResult;
        },
        catch: (cause) => makeGitCommandError({ args, options, cause }),
      });

    return {
      run,
    } satisfies GitService;
  }),
);

export const run = (
  args: ReadonlyArray<string>,
  options?: GitCommandOptions,
): Effect.Effect<GitCommandResult, GitCommandError> =>
  Effect.contextWithEffect((ctx) =>
    Context.unsafeGet(ctx, Git).run(args, options),
  );
