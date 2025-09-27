import { describe, expect, test } from "bun:test";
import { Git, getCurrentBranch, log, status } from "../src/index.js";

describe("Git Core", () => {
  test("should export Git context tag", () => {
    expect(Git).toBeDefined();
    expect(Git).toHaveProperty("key");
    expect(Git.key).toBe("@open-composer/git/Git");
  });

  test("should have git commands available", () => {
    expect(status).toBeDefined();
    expect(log).toBeDefined();
    expect(getCurrentBranch).toBeDefined();
  });

  test("git commands should be functions", () => {
    expect(typeof status).toBe("function");
    expect(typeof log).toBe("function");
    expect(typeof getCurrentBranch).toBe("function");
  });
});
