import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { GitStackLive, logStack, runWithGitStack } from "../src/index.js";

describe("GitStack", () => {
  test("log returns helpful message when stack is empty", async () => {
    const lines = await Effect.runPromise(runWithGitStack(logStack));
    expect(lines[0]).toContain("No tracked stack branches");
  });
});
