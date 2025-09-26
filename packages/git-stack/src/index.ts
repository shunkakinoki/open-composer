import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
  GitStack,
  GitStackLive,
  provideGitStack,
  type GitStackService,
  type StackNode,
  type StackState,
  type StackStatus,
} from "./service.js";

export type { GitStackService, StackNode, StackState, StackStatus };
export { GitStack, GitStackLive, provideGitStack };

const withService = <A>(
  f: (service: GitStackService) => Effect.Effect<A>,
): Effect.Effect<A> =>
  Effect.flatMap(
    Effect.contextWith((context) => Context.unsafeGet(context, GitStack)),
    f,
  );

export const listStack = withService((service) => service.list);
export const logStack = withService((service) => service.log);
export const statusStack = withService((service) => service.status);
export const createStackBranch = (input: {
  readonly name: string;
  readonly base?: string;
}) => withService((service) => service.create(input));
export const trackStackBranch = (branch: string, parent: string) =>
  withService((service) => service.track(branch, parent));
export const untrackStackBranch = (branch: string) =>
  withService((service) => service.untrack(branch));
export const deleteStackBranch = (branch: string, force = false) =>
  withService((service) => service.remove(branch, force));
export const checkoutStackBranch = (branch: string) =>
  withService((service) => service.checkout(branch));
export const syncStack = withService((service) => service.sync);
export const submitStack = withService((service) => service.submit);
export const restackStack = withService((service) => service.restack);
export const configureStack = (remote: string) =>
  withService((service) => service.config({ remote }));

export const runWithGitStack = <A>(effect: Effect.Effect<A>) =>
  provideGitStack(effect);
