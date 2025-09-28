import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
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

// Quick check if command might be available using 'which' or common paths
const commandMightExist = (command: string): Effect.Effect<boolean, never> =>
  Effect.sync(() => {
    try {
      execSync(`which ${command}`, {
        encoding: "utf8",
        timeout: 500, // Very short timeout for existence check
        stdio: "pipe",
      });
      return true;
    } catch {
      // Check common installation paths as fallback
      const commonPaths = [
        "/usr/local/bin",
        "/usr/bin",
        "/opt/homebrew/bin", // macOS Homebrew
        "/home/linuxbrew/.linuxbrew/bin", // Linux Homebrew
        join(process.env.HOME || "", ".local/bin"),
      ];
      return commonPaths.some((path) => existsSync(join(path, command)));
    }
  });

const execCommand = (command: string): Effect.Effect<string, Error> =>
  Effect.try({
    try: () =>
      execSync(command, {
        encoding: "utf8",
        timeout: 1000, // Reduced from 5000ms for faster agent checking
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
    // Check if both opencode and gh commands exist
    const [opencodeExists, ghExists] = yield* Effect.all(
      [commandMightExist("opencode"), commandMightExist("gh")],
      { concurrency: "unbounded" },
    );

    if (!opencodeExists) {
      return {
        name: "opencode",
        available: false,
        error: "OpenCode CLI not found. Please install OpenCode CLI.",
      } satisfies AgentStatus;
    }

    if (!ghExists) {
      return {
        name: "opencode",
        available: false,
        error: "GitHub CLI not found. Please install GitHub CLI.",
      } satisfies AgentStatus;
    }

    // Run version and auth checks in parallel
    const [versionResult] = yield* Effect.all(
      [
        Effect.try(() => {
          const result = execSync("opencode --version", {
            encoding: "utf8",
            timeout: 1000,
            stdio: "pipe",
          });
          const versionMatch = result.match(/version\s+([\d.]+)/i);
          return versionMatch ? versionMatch[1] : undefined;
        }),
        Effect.try(() =>
          execSync("gh auth status", {
            encoding: "utf8",
            timeout: 1000,
            stdio: "pipe",
          }),
        ),
      ],
      { concurrency: "unbounded" },
    );

    return {
      name: "opencode",
      available: true,
      version: versionResult,
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
