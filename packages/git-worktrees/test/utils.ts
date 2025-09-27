import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type {
  GitCommandError,
  GitCommandOptions,
  GitCommandResult,
  GitService,
} from "@open-composer/git";
import { Git as GitTag } from "@open-composer/git";

export interface GitCall {
  readonly args: ReadonlyArray<string>;
  readonly options?: GitCommandOptions | undefined;
}

export type GitStubResponse =
  | { readonly result: GitCommandResult }
  | { readonly error: GitCommandError };

export interface GitStub {
  readonly calls: GitCall[];
  readonly layer: Layer.Layer<never, never, typeof GitTag.Identifier>;
  readonly provide: <A, E, R>(
    effect: Effect.Effect<A, E, R | typeof GitTag.Identifier>,
  ) => Effect.Effect<A, E, R>;
}

export const createGitStub = (
  responses: ReadonlyArray<GitStubResponse>,
): GitStub => {
  const calls: GitCall[] = [];
  let index = 0;

  const git: GitService = {
    run: (args, options) => {
      calls.push({ args: [...args], options });
      const response = responses[index++] ?? {
        result: { stdout: "", stderr: "" },
      };
      if ("error" in response) {
        return Effect.fail(response.error);
      }
      return Effect.succeed(response.result);
    },
  };

  const layer = Layer.succeed(GitTag, git);

  return {
    calls,
    layer,
    provide: (effect) => effect.pipe(Effect.provide(layer)),
  } satisfies GitStub;
};

export const success = (stdout: string, stderr = ""): GitStubResponse => ({
  result: { stdout, stderr },
});

export const failure = (error: GitCommandError): GitStubResponse => ({
  error,
});
