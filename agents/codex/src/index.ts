import { execSync } from "node:child_process";
import type {
  AgentChecker,
  AgentDefinition,
  AgentStatus,
} from "@open-composer/agent-types";
import * as Effect from "effect/Effect";

const definition: AgentDefinition = {
  name: "codex",
  icon: "📝",
  role: "Code generation and assistance",
  keywords: ["codex", "generate", "write", "code"],
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

const checkInstallation = (): Effect.Effect<AgentStatus> =>
  Effect.gen(function* () {
    // Check if GitHub Copilot CLI (gh copilot) is available
    const result = yield* execCommand("gh copilot --version");

    const versionMatch = result.match(/version\s+([\d.]+)/i);
    const version = versionMatch ? versionMatch[1] : undefined;

    // Check if copilot is properly authenticated
    yield* execCommand("gh auth status");

    return {
      name: "codex",
      available: true,
      version,
      path: "gh copilot",
    } satisfies AgentStatus;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        name: "codex",
        available: false,
        error: (error as Error).message,
      } satisfies AgentStatus),
    ),
  );

const checkCodex: AgentChecker = {
  check: checkInstallation,
  definition,
};

export default checkCodex;
