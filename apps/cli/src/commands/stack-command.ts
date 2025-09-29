import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { StackService } from "../services/stack-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

function buildLogCommand() {
  return Command.make("log").pipe(
    Command.withDescription("Display the current stack tree"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("stack", "log");
        yield* trackFeatureUsage("stack_log");

        const cli = new StackService();
        yield* cli.log();
      }),
    ),
  );
}

function buildStatusCommand() {
  return Command.make("status").pipe(
    Command.withDescription("Show stack status for the current branch"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.status();
      }),
    ),
  );
}

function buildCreateCommand() {
  const branchArg = Args.text({ name: "branch" }).pipe(
    Args.withDescription("Name of the new branch"),
  );
  const baseOption = Options.text("base").pipe(
    Options.optional,
    Options.withDescription("Base branch to stack on"),
  );
  return Command.make("create", { branch: branchArg, base: baseOption }).pipe(
    Command.withDescription("Create and track a new branch"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("stack", "create");
        yield* trackFeatureUsage("stack_create", {
          has_base: Option.isSome(config.base),
          branch_length: config.branch.length,
        });

        const cli = new StackService();
        yield* cli.create(config.branch, Option.getOrUndefined(config.base));
      }),
    ),
  );
}

function buildTrackCommand() {
  const branchArg = Args.text({ name: "branch" }).pipe(
    Args.withDescription("Branch to track"),
  );
  const parentArg = Args.text({ name: "parent" }).pipe(
    Args.withDescription("Parent branch in the stack"),
  );
  return Command.make("track", { branch: branchArg, parent: parentArg }).pipe(
    Command.withDescription("Track a branch on top of another"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.track(config.branch, config.parent);
      }),
    ),
  );
}

function buildUntrackCommand() {
  const branchArg = Args.text({ name: "branch" }).pipe(
    Args.withDescription("Branch to untrack"),
  );
  return Command.make("untrack", { branch: branchArg }).pipe(
    Command.withDescription("Remove tracking information for a branch"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.untrack(config.branch);
      }),
    ),
  );
}

function buildDeleteCommand() {
  const branchArg = Args.text({ name: "branch" }).pipe(
    Args.withDescription("Branch to delete"),
  );
  const forceOption = Options.boolean("force").pipe(
    Options.withDescription("Force delete the branch"),
  );
  return Command.make("delete", { branch: branchArg, force: forceOption }).pipe(
    Command.withDescription("Delete a tracked branch"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.remove(config.branch, config.force);
      }),
    ),
  );
}

function buildCheckoutCommand() {
  const branchArg = Args.text({ name: "branch" }).pipe(
    Args.withDescription("Branch to checkout"),
  );
  return Command.make("checkout", { branch: branchArg }).pipe(
    Command.withDescription("Checkout a branch in the stack"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.checkout(config.branch);
      }),
    ),
  );
}

function buildSyncCommand() {
  return Command.make("sync").pipe(
    Command.withDescription("Sync the stack with the remote (informational)"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.sync();
      }),
    ),
  );
}

function buildSubmitCommand() {
  return Command.make("submit").pipe(
    Command.withDescription("Submit the stack for review (informational)"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.submit();
      }),
    ),
  );
}

function buildRestackCommand() {
  return Command.make("restack").pipe(
    Command.withDescription("Restack the current stack (informational)"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.restack();
      }),
    ),
  );
}

function buildConfigCommand() {
  const remoteArg = Args.text({ name: "remote" }).pipe(
    Args.withDescription("Default remote to use"),
  );
  return Command.make("config", { remote: remoteArg }).pipe(
    Command.withDescription("Configure stack defaults"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = new StackService();
        yield* cli.config(config.remote);
      }),
    ),
  );
}

export const buildStackCommand = (): CommandBuilder<"stack"> => ({
  command: () =>
    Command.make("stack").pipe(
      Command.withDescription("Manage stacked pull requests"),
      Command.withSubcommands([
        buildLogCommand(),
        buildStatusCommand(),
        buildCreateCommand(),
        buildTrackCommand(),
        buildUntrackCommand(),
        buildDeleteCommand(),
        buildCheckoutCommand(),
        buildSyncCommand(),
        buildSubmitCommand(),
        buildRestackCommand(),
        buildConfigCommand(),
      ]),
    ),
  metadata: {
    name: "stack",
    description: "Manage stacked pull requests",
  },
});
