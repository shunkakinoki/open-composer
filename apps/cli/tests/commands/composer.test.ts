import { describe, expect, it } from "bun:test";
import { buildRootCommand, buildRunner } from "../../src/commands/composer.js";

describe("composer command", () => {
  it("should build root command successfully", () => {
    const command = buildRootCommand();
    expect(command).toBeDefined();
    expect(typeof command).toBe("object");
  });

  it("should build runner successfully", () => {
    const runner = buildRunner();
    expect(typeof runner).toBe("function");
    expect(runner).toBeDefined();
  });
});
