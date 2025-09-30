import { describe, expect, test } from "bun:test";
import { run } from "../src/index.js";


describe.concurrent("GitHub CLI Package", () => {
  describe.concurrent("run", () => {
    test.concurrent("should export run function", async () => {
      expect(typeof run).toBe("function");
    });

    test.concurrent("should create an Effect for GitHub commands", async () => {
      const effect = run(["--help"]);
      expect(effect).toBeDefined();
      // Note: We don't run the effect as it would require gh CLI
    });
  });

  // Note: Actual CLI tests would require gh CLI to be installed
  // and authenticated, which is not suitable for CI
  describe.concurrent("commands", () => {
    test.concurrent("should export authStatus", async () => {
      const { authStatus } = await import("../src/commands.js");
      expect(typeof authStatus).toBe("object");
    });
  });
});
