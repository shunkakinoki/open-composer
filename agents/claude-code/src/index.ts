import { execSync } from "node:child_process";
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

const execCommand = (command: string): Effect.Effect<string, Error> =>
  Effect.try({
    try: () =>
      execSync(command, {
        encoding: "utf8",
        timeout: 5000,
      }),
    catch: (error) =>
      new Error(`Command failed: ${command} - ${(error as Error).message}`),
  });

const checkCommand = (
  command: string,
): Effect.Effect<{ version?: string; path: string }, Error> =>
  pipe(
    execCommand(`${command} --version`),
    Effect.map((result) => {
      const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[0] : undefined;
      return { version, path: command };
    }),
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
          version,
          path,
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
