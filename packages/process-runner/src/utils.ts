import * as Effect from "effect/Effect";
import {
  MAX_COMMAND_LENGTH,
  MAX_SESSION_NAME_LENGTH,
  SESSION_NAME_PATTERN,
} from "./constants.js";
import { ProcessRunnerError } from "./types.js";

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export function validateSessionName(
  sessionName: string,
): Effect.Effect<string, ProcessRunnerError> {
  if (!sessionName || typeof sessionName !== "string") {
    return Effect.fail(
      ProcessRunnerError("Session name must be a non-empty string"),
    );
  }

  if (sessionName.length > MAX_SESSION_NAME_LENGTH) {
    return Effect.fail(
      ProcessRunnerError(
        `Session name too long (max ${MAX_SESSION_NAME_LENGTH} characters)`,
      ),
    );
  }

  if (!SESSION_NAME_PATTERN.test(sessionName)) {
    return Effect.fail(
      ProcessRunnerError(
        "Session name can only contain letters, numbers, hyphens, and underscores",
      ),
    );
  }

  return Effect.succeed(sessionName);
}

export function validateCommand(
  command: string,
): Effect.Effect<string, ProcessRunnerError> {
  if (!command || typeof command !== "string") {
    return Effect.fail(
      ProcessRunnerError("Command must be a non-empty string"),
    );
  }

  if (command.length > MAX_COMMAND_LENGTH) {
    return Effect.fail(
      ProcessRunnerError(
        `Command too long (max ${MAX_COMMAND_LENGTH} characters)`,
      ),
    );
  }

  // Basic command injection prevention - only reject null bytes
  if (command.includes("\x00")) {
    return Effect.fail(
      ProcessRunnerError("Command contains invalid characters"),
    );
  }

  return Effect.succeed(command);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function withTimeout<T>(
  effect: Effect.Effect<T, ProcessRunnerError>,
  timeoutMs: number,
  timeoutMessage: string = "Operation timed out",
): Effect.Effect<T, ProcessRunnerError> {
  const timeoutEffect = Effect.async<T, ProcessRunnerError>((resume) => {
    const timeout = setTimeout(() => {
      resume(Effect.fail(ProcessRunnerError(timeoutMessage)));
    }, timeoutMs);
    return Effect.sync(() => clearTimeout(timeout));
  });

  return Effect.race(effect, timeoutEffect);
}
