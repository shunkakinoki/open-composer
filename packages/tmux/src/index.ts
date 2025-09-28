import * as Effect from "effect/Effect";
import { TmuxService } from "./core.js";

// Core tmux functionality
export {
  TmuxCommandError,
  type TmuxCommandOptions,
  type TmuxCommandResult,
  TmuxService,
  type TmuxSessionInfo,
} from "./core.js";

export const newSession = (
  sessionName: string,
  command?: string,
  options?: Parameters<TmuxService["newSession"]>[2],
) =>
  TmuxService.make().pipe(
    Effect.flatMap((service) =>
      service.newSession(sessionName, command, options),
    ),
  );

export const listSessions = () =>
  TmuxService.make().pipe(Effect.flatMap((service) => service.listSessions()));

export const killSession = (sessionName: string) =>
  TmuxService.make().pipe(
    Effect.flatMap((service) => service.killSession(sessionName)),
  );

export const isTmuxAvailable = () =>
  TmuxService.make().pipe(Effect.flatMap((service) => service.isAvailable()));
