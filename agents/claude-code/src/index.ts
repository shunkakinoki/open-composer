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
  name: "claude-code",
  icon: "🤖",
  role: "Code review and planning",
  keywords: ["claude", "review", "analyze", "plan"],
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

const checkCommand = (
  command: string,
): Effect.Effect<{ version?: string; path: string }, Error> =>
  pipe(
    commandMightExist(command),
    Effect.flatMap((exists) =>
      exists
        ? pipe(
            execCommand(`${command} --version`),
            Effect.map((result) => {
              const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
              const version = versionMatch ? versionMatch[0] : undefined;
              return {
                path: command,
                ...(version !== undefined && { version }),
              };
            }),
          )
        : Effect.fail(new Error(`Command not found: ${command}`)),
    ),
  );

const checkInstallation = (): Effect.Effect<AgentStatus> =>
  pipe(
    // Try primary command first
    checkCommand("claude"),
    Effect.orElse(() =>
      // Try alternative commands
      pipe(
        Effect.forEach(["claude-code", "anthropic-claude"], checkCommand),
        Effect.map((results) => results[0]), // Take first successful result
      ),
    ),
    Effect.map(
      ({ version, path }) =>
        ({
          name: "claude-code",
          available: true,
          path,
          ...(version !== undefined && { version }),
        }) satisfies AgentStatus,
    ),
    Effect.catchAll(() =>
      Effect.succeed({
        name: "claude-code",
        available: false,
        error:
          "Claude Code CLI not found. Install from https://docs.anthropic.com/claude/docs/desktop",
      } satisfies AgentStatus),
    ),
  );

const checkClaudeCode: AgentChecker = {
  check: checkInstallation,
  definition,
};

export default checkClaudeCode;
export * from "./sessions.js";
