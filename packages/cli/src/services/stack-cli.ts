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

const provideStack = <A>(effect: Effect.Effect<A>) =>
  effect.pipe(Effect.provide(GitStackLive));

export class StackCli {
  log(): Effect.Effect<void> {
    return provideStack(logStack).pipe(Effect.flatMap(printLines));
  }

  status(): Effect.Effect<void> {
    return provideStack(statusStack).pipe(
      Effect.flatMap((status) =>
        printLines([
          `Current branch: ${status.currentBranch}`,
          `Parent: ${status.parent ?? "<none>"}`,
          status.children.length > 0
            ? `Children: ${status.children.join(", ")}`
            : "Children: <none>",
        ]),
      ),
    );
  }

  create(name: string, base?: string): Effect.Effect<void> {
    return provideStack(createStackBranch({ name, base })).pipe(
      Effect.flatMap((result) =>
        printLines([
          `Created branch ${result.branch} on top of ${result.base}.`,
        ]),
      ),
    );
  }

  track(branch: string, parent: string): Effect.Effect<void> {
    return provideStack(trackStackBranch(branch, parent)).pipe(
      Effect.flatMap(() =>
        printLines([`Tracking branch ${branch} on top of ${parent}.`]),
      ),
    );
  }

  untrack(branch: string): Effect.Effect<void> {
    return provideStack(untrackStackBranch(branch)).pipe(
      Effect.flatMap(() =>
        printLines([`Removed tracking for branch ${branch}.`]),
      ),
    );
  }

  remove(branch: string, force: boolean): Effect.Effect<void> {
    return provideStack(deleteStackBranch(branch, force)).pipe(
      Effect.flatMap(() =>
        printLines([`Deleted branch ${branch}${force ? " (force)" : ""}.`]),
      ),
    );
  }

  checkout(branch: string): Effect.Effect<void> {
    return provideStack(checkoutStackBranch(branch)).pipe(
      Effect.flatMap(() => printLines([`Checked out branch ${branch}.`])),
    );
  }

  sync(): Effect.Effect<void> {
    return provideStack(syncStack).pipe(Effect.flatMap(printLines));
  }

  submit(): Effect.Effect<void> {
    return provideStack(submitStack).pipe(Effect.flatMap(printLines));
  }

  restack(): Effect.Effect<void> {
    return provideStack(restackStack).pipe(Effect.flatMap(printLines));
  }

  config(remote: string): Effect.Effect<void> {
    return provideStack(configureStack(remote)).pipe(
      Effect.flatMap(() =>
        printLines([`Set default stack remote to '${remote}'.`]),
      ),
    );
  }
}
