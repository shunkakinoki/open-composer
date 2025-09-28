import type { TmuxService } from "./core.js";

// Core tmux functionality
export {
  TmuxCommandError,
  type TmuxCommandOptions,
  type TmuxCommandResult,
  TmuxService,
  type TmuxSessionInfo,
} from "./core.js";

export const newSession =
  (
    sessionName: string,
    command?: string,
    options?: Parameters<TmuxService["newSession"]>[2],
  ) =>
  (service: TmuxService) =>
    service.newSession(sessionName, command, options);

export const listSessions = () => (service: TmuxService) =>
  service.listSessions();

export const killSession = (sessionName: string) => (service: TmuxService) =>
  service.killSession(sessionName);

export const isTmuxAvailable = () => (service: TmuxService) =>
  service.isAvailable();
