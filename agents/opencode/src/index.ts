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
      }),
    catch: (error) =>
      new Error(`Command failed: ${command} - ${(error as Error).message}`),
  });

const checkFileExists = (path: string): Effect.Effect<boolean> =>
  Effect.sync(() => existsSync(path));

const checkToolAtPath = (
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

const checkTool = (tool: {
  command: string;
  paths: readonly string[];
}): Effect.Effect<{ version?: string; path: string }, Error> =>
  pipe(
    // First try the command in PATH
    execCommand(`${tool.command} --version`),
    Effect.map((result) => {
      const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[0] : undefined;
      return { version, path: tool.command };
    }),
    Effect.orElse(() =>
      // If that fails, try alternative paths
      pipe(
        Effect.forEach(tool.paths, (path) =>
          pipe(
            checkFileExists(path),
            Effect.flatMap((exists) =>
              exists
                ? checkToolAtPath(path)
                : Effect.fail(new Error(`Path does not exist: ${path}`)),
            ),
          ),
        ),
        Effect.map((results) => results[0]), // Take first successful result
      ),
    ),
  );

const checkInstallation = (): Effect.Effect<AgentStatus> => {
  const tools = [
    {
      name: "opencode-interpreter",
      command: "opencode",
      paths: ["/usr/local/bin/opencode", "/usr/bin/opencode"] as const,
    },
    {
      name: "aider",
      command: "aider",
      paths: ["/usr/local/bin/aider", "/usr/bin/aider"] as const,
    },
    {
      name: "codey",
      command: "codey",
      paths: ["/usr/local/bin/codey", "/usr/bin/codey"] as const,
    },
  ] as const;

  return pipe(
    Effect.forEach(tools, checkTool),
    Effect.map((results) => results[0]), // Take first successful result
    Effect.map(
      ({ version, path }) =>
        ({
          name: "opencode",
          available: true,
          version,
          path,
        }) satisfies AgentStatus,
    ),
    Effect.catchAll(() =>
      Effect.succeed({
        name: "opencode",
        available: false,
        error:
          "No open-source coding assistant found. Try installing aider, opencode-interpreter, or codey.",
      } satisfies AgentStatus),
    ),
  );
};

const checkOpencode: AgentChecker = {
  check: checkInstallation,
  definition,
};

export default checkOpencode;
