import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  AgentChecker,
  AgentDefinition,
  AgentStatus,
} from "@open-composer/agent-types";
import * as Effect from "effect/Effect";

const definition: AgentDefinition = {
  name: "cursor",
  icon: "🖱️",
  role: "AI-powered code editor",
  keywords: ["cursor", "editor", "ai", "copilot"],
} as const;

// Quick check if command might be available using 'which' or common paths
const commandMightExist = (command: string): Effect.Effect<boolean, never> =>
  Effect.sync(() => {
    try {
      execSync(`which ${command}`, {
        encoding: "utf8",
        timeout: 500,
        stdio: "pipe",
      });
      return true;
    } catch {
      // Check common installation paths as fallback
      const commonPaths = [
        "/usr/local/bin",
        "/usr/bin",
        "/Applications/Cursor.app/Contents/MacOS", // macOS
        join(process.env.HOME || "", ".cursor"),
      ];
      return commonPaths.some((path) => existsSync(join(path, command)));
    }
  });

const checkInstallation = (): Effect.Effect<AgentStatus> =>
  Effect.gen(function* () {
    const cursorExists = yield* commandMightExist("cursor");

    if (!cursorExists) {
      return {
        name: "cursor",
        available: false,
        error: "Cursor not found. Please install Cursor.",
      } satisfies AgentStatus;
    }

    return {
      name: "cursor",
      available: true,
      path: "cursor",
    } satisfies AgentStatus;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        name: "cursor",
        available: false,
        error: (error as Error).message,
      } satisfies AgentStatus),
    ),
  );

const checkCursor: AgentChecker = {
  check: checkInstallation,
  definition,
};

export default checkCursor;
export * from "./sessions.js";
