import type { Command } from "@effect/cli/Command";

// Interface for command metadata to avoid internal property access
export interface CommandMetadata {
  name: string;
  description: string;
}

// Interface for command builders that provide both command and metadata
export interface CommandBuilder<
  Name extends string = string,
  // biome-ignore lint/suspicious/noExplicitAny: Effect Command environment type
  R = any,
  // biome-ignore lint/suspicious/noExplicitAny: Effect Command error type
  E = any,
  // biome-ignore lint/suspicious/noExplicitAny: Effect Command args type
  A = any,
> {
  command: () => Command<Name, R, E, A>;
  metadata: CommandMetadata;
}
