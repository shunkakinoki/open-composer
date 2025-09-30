import { describe, expect, test } from "bun:test";
import { Git, getCurrentBranch, log, status } from "../src/index.js";


const gitCommands = [
  ["status", status],
  ["log", log],
  ["getCurrentBranch", getCurrentBranch],
] as const;

describe.concurrent("Git Core", () => {
  test.concurrent("should export Git context tag", async () => {
    expect(Git).toBeDefined();
    expect(Git).toHaveProperty("key");
    expect(Git.key).toBe("@open-composer/git/Git");
  });

  for (const [name, command] of gitCommands) {
    test.concurrent(`should expose ${name} command as a function`, async () => {
      expect(command).toBeDefined();
      expect(typeof command).toBe("function");
    });
  }
});
