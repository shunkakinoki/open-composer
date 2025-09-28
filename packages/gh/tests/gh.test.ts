import { describe, expect, it } from "bun:test";
import { run } from "../src/index.js";

describe("GitHub CLI Package", () => {
  describe("run", () => {
    it("should export run function", () => {
      expect(typeof run).toBe("function");
    });

    it("should create an Effect for GitHub commands", () => {
      const effect = run(["--help"]);
      expect(effect).toBeDefined();
      // Note: We don't run the effect as it would require gh CLI
    });
  });

  // Note: Actual CLI tests would require gh CLI to be installed
  // and authenticated, which is not suitable for CI
  describe("commands", () => {
    it("should export authStatus", async () => {
      const { authStatus } = await import("../src/commands.js");
      expect(typeof authStatus).toBe("object");
    });
  });
});
