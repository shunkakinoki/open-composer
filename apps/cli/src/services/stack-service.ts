import type { GitCommandError } from "@open-composer/git";
import {
  checkoutStackBranch,
  configureStack,
  createStackBranch,
  deleteStackBranch,
  GitStackLive,
  logStack,
  restackStack,
  statusStack,
  submitStack,
  syncStack,
  trackStackBranch,
  untrackStackBranch,
} from "@open-composer/git-stack";
import * as Effect from "effect/Effect";

const printLines = (lines: ReadonlyArray<string>) =>
  Effect.forEach(lines, (line) => Effect.sync(() => console.log(line)), {
    discard: true,
  });

const provideStack = <A, E>(
  effectOrFn: Effect.Effect<A, E> | (() => Effect.Effect<A, E>),
) => {
  // In test environment, run the effect and wrap the result in a new Effect
  if (process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test") {
    const effect = typeof effectOrFn === "function" ? effectOrFn() : effectOrFn;
    return Effect.sync(() => Effect.runSync(effect));
  }
  const effect = typeof effectOrFn === "function" ? effectOrFn() : effectOrFn;
  return effect.pipe(Effect.provide(GitStackLive));
};

const handleGitError = (error: GitCommandError): Effect.Effect<void> =>
  Effect.sync(() => {
    console.error(`Git command failed: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
  });

export class StackService {
  // Allow overriding functions for testing
  logStack: typeof logStack = logStack;
  statusStack: typeof statusStack = statusStack;
  createStackBranch: typeof createStackBranch = createStackBranch;
  trackStackBranch: typeof trackStackBranch = trackStackBranch;
  untrackStackBranch: typeof untrackStackBranch = untrackStackBranch;
  deleteStackBranch: typeof deleteStackBranch = deleteStackBranch;
  checkoutStackBranch: typeof checkoutStackBranch = checkoutStackBranch;
  syncStack: typeof syncStack = syncStack;
  submitStack: typeof submitStack = submitStack;
  restackStack: typeof restackStack = restackStack;
  configureStack: typeof configureStack = configureStack;

  log(): Effect.Effect<void> {
    return provideStack(this.logStack).pipe(Effect.flatMap(printLines));
  }

  status(): Effect.Effect<void> {
    return provideStack(this.statusStack).pipe(
      Effect.flatMap((status) =>
        printLines([
          `Current branch: ${status.currentBranch}`,
          `Parent: ${status.parent ?? "<none>"}`,
          status.children.length > 0
            ? `Children: ${status.children.join(", ")}`
            : "Children: <none>",
        ]),
      ),
      Effect.catchTag("GitCommandError", handleGitError),
    );
  }

  create(name: string, base?: string): Effect.Effect<void> {
    return provideStack(this.createStackBranch({ name, base })).pipe(
      Effect.flatMap((result) =>
        printLines([
          `Created branch ${result.branch} on top of ${result.base}.`,
        ]),
      ),
      Effect.catchTag("GitCommandError", handleGitError),
    );
  }

  track(branch: string, parent: string): Effect.Effect<void> {
    return provideStack(this.trackStackBranch(branch, parent)).pipe(
      Effect.flatMap(() =>
        printLines([`Tracking branch ${branch} on top of ${parent}.`]),
      ),
    );
  }

  untrack(branch: string): Effect.Effect<void> {
    return provideStack(this.untrackStackBranch(branch)).pipe(
      Effect.flatMap(() =>
        printLines([`Removed tracking for branch ${branch}.`]),
      ),
    );
  }

  remove(branch: string, force: boolean): Effect.Effect<void> {
    return provideStack(this.deleteStackBranch(branch, force)).pipe(
      Effect.flatMap(() =>
        printLines([`Deleted branch ${branch}${force ? " (force)" : ""}.`]),
      ),
      Effect.catchTag("GitCommandError", handleGitError),
    );
  }

  checkout(branch: string): Effect.Effect<void> {
    return provideStack(this.checkoutStackBranch(branch)).pipe(
      Effect.flatMap(() => printLines([`Checked out branch ${branch}.`])),
      Effect.catchTag("GitCommandError", handleGitError),
    );
  }

  sync(): Effect.Effect<void> {
    return provideStack(this.syncStack).pipe(Effect.flatMap(printLines));
  }

  submit(): Effect.Effect<void> {
    return provideStack(this.submitStack).pipe(
      Effect.flatMap(printLines),
      Effect.catchTag("GitCommandError", handleGitError),
    );
  }

  restack(): Effect.Effect<void> {
    return provideStack(this.restackStack).pipe(Effect.flatMap(printLines));
  }

  config(remote: string): Effect.Effect<void> {
    return provideStack(this.configureStack(remote)).pipe(
      Effect.flatMap(() =>
        printLines([`Set default stack remote to '${remote}'.`]),
      ),
    );
  }
}
