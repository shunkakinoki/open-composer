import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type {
  AgentChecker,
  AgentDefinition,
  AgentStatus,
} from "@open-composer/agent-types";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";

const definition: AgentDefinition = {
  name: "opencode",
  icon: "🌐",
  role: "Open-source code assistance",
  keywords: ["open", "opensource", "snippet", "search"],
} as const;

const execCommand = (command: string): Effect.Effect<string, Error> =>
  Effect.try({
    try: () =>
      execSync(command, {
        encoding: "utf8",
        timeout: 5000,
        stdio: "pipe", // Suppress output to console
      }),
    catch: (error) =>
      new Error(`Command failed: ${command} - ${(error as Error).message}`),
  });

const _checkFileExists = (path: string): Effect.Effect<boolean> =>
  Effect.sync(() => existsSync(path));

const _checkToolAtPath = (
  path: string,
): Effect.Effect<{ version?: string; path: string }, Error> =>
  pipe(
    execCommand(`${path} --version`),
    Effect.map((result) => {
      const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[0] : undefined;
      return { version, path };
    }),
  );

const checkInstallation = (): Effect.Effect<AgentStatus> =>
  Effect.gen(function* () {
    // Check if Codex is available
    const result = yield* execCommand("opencode --version");

    const versionMatch = result.match(/version\s+([\d.]+)/i);
    const version = versionMatch ? versionMatch[1] : undefined;

    // Check if copilot is properly authenticated
    yield* execCommand("gh auth status");

    return {
      name: "opencode",
      available: true,
      version,
      path: "opencode",
    } satisfies AgentStatus;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        name: "opencode",
        available: false,
        error: (error as Error).message,
      } satisfies AgentStatus),
    ),
  );

const checkOpencode: AgentChecker = {
  check: checkInstallation,
  definition,
};

export default checkOpencode;
