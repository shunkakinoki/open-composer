import { describe, expect, it } from "bun:test";
import { buildStackCommand } from "../../src/commands/stack-command.js";

describe("stack command", () => {
  it("should build stack command successfully", () => {
    const command = buildStackCommand();
    expect(command).toBeDefined();
    expect(typeof command).toBe("object");
  });
});
