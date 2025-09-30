import { describe, expect, test } from "bun:test";
import { createPR, getPRStatus } from "../src/index.js";


describe.concurrent("GitHub PR Package", () => {
  describe.concurrent("createPR", () => {
    test.concurrent("should export createPR function", () => {
      expect(typeof createPR).toBe("function");
    });

    test.concurrent("should create PR effect", () => {
      const prOptions = {
        title: "Test PR",
        body: "Test body",
        base: "main",
        head: "feature/test",
        draft: false,
      };

      // This test just verifies the function can be called
      // Actual execution would require gh CLI and would be an integration test
      const effect = createPR(prOptions);
      expect(effect).toBeDefined();
    });
  });

  describe.concurrent("getPRStatus", () => {
    test.concurrent("should export getPRStatus function", () => {
      expect(typeof getPRStatus).toBe("function");
    });

    test.concurrent("should create status effect", () => {
      const effect = getPRStatus(123);
      expect(effect).toBeDefined();
    });
  });

  // Note: Actual CLI tests would require gh CLI to be installed
  // and authenticated, which is not suitable for CI
});
