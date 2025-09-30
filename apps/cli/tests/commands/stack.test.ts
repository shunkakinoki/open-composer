import { describe, expect, test } from "bun:test";
import { buildStackCommand } from "../../src/commands/stack-command.js";

describe.concurrent("stack command", () => {
  test.concurrent("should build stack command successfully", () => {
    const command = buildStackCommand();
    expect(command).toBeDefined();
    expect(typeof command).toBe("object");
  });
});
