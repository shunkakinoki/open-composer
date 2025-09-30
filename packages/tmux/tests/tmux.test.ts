import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { TmuxService } from "../src/core.js";


describe("TmuxService", () => {
  test.serial("should create a service instance", async () => {
    const result = await Effect.runPromise(TmuxService.make());
    expect(result).toBeInstanceOf(TmuxService);
  });

  test.serial("should check if tmux is available", async () => {
    const service = await Effect.runPromise(TmuxService.make());
    const result = await Effect.runPromise(service.isAvailable());
    expect(typeof result).toBe("boolean");
  });

  test.serial("should handle tmux command errors gracefully", async () => {
    const service = await Effect.runPromise(TmuxService.make());

    // Try to get PID of non-existent session
    const result = await Effect.runPromise(
      Effect.either(service.getSessionPid("non-existent-session")),
    );

    expect(result._tag).toBe("Left");
  });
});
