import { afterEach, beforeEach, describe, expect, test, mock, spyOn } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import * as Effect from "effect/Effect";

// Mock external dependencies before importing the service
mock.module("node:fs", () => ({
  existsSync: mock(() => false),
}));

mock.module("node:path", () => ({
  join: path.join,
}));

mock.module("@open-composer/gh-pr", () => ({
  createPR: mock((options: unknown) =>
    Effect.succeed({
      number: 123,
      url: "https://github.com/test/repo/pull/123",
      autoMergeEnabled: (options as { auto?: boolean }).auto || false,
    }),
  ),
  getPRStatus: mock((_prNumber: number) =>
    Effect.succeed({
      isInMergeQueue: false,
      mergeable: true,
      mergeStateStatus: "clean",
      autoMergeEnabled: false,
    }),
  ),
  listPRs: mock((_options?: unknown) =>
    Effect.succeed({
      stdout: JSON.stringify([
        { number: 123, title: "Test PR", state: "open" },
        { number: 124, title: "Another PR", state: "closed" },
      ]),
    }),
  ),
  viewPR: mock((prNumber: number, _options?: unknown) =>
    Effect.succeed({
      stdout: `PR #${prNumber}: Test PR\nState: open\nURL: https://github.com/test/repo/pull/${prNumber}`,
    }),
  ),
  mergePR: mock((prNumber: number, _options?: unknown) =>
    Effect.succeed({
      stdout: `Successfully merged PR #${prNumber}`,
    }),
  ),
}));

// Mock execFileAsync that will be used by the service
const mockExecFileAsync = mock(async (cmd: string, args: string[]) => {
  if (cmd === "which" && args[0] === "gh") {
    return { stdout: "/usr/local/bin/gh", stderr: "" };
  }
  if (cmd === "gh" && args[0] === "auth" && args[1] === "status") {
    return { stdout: "✓ Logged in to github.com", stderr: "" };
  }
  if (cmd === "gh" && args.includes("repo") && args.includes("view")) {
    return { stdout: "test/repo", stderr: "" };
  }
  if (cmd === "git" && args.includes("rev-parse") && args.includes("HEAD")) {
    return { stdout: "main", stderr: "" };
  }
  if (
    cmd === "git" &&
    args.includes("status") &&
    args.includes("--porcelain")
  ) {
    return { stdout: "", stderr: "" };
  }
  if (cmd === "git" && args.includes("rev-list")) {
    return { stdout: "0", stderr: "" };
  }
  if (cmd === "which" && args[0] === "bun") {
    return { stdout: "/usr/local/bin/bun", stderr: "" };
  }
  if (cmd === "bun" && args.includes("run") && args.includes("lint")) {
    return { stdout: "✓ Linting passed", stderr: "" };
  }
  if (cmd === "bun" && args.includes("run") && args.includes("format-check")) {
    return { stdout: "✓ Formatting passed", stderr: "" };
  }
  if (cmd === "bun" && args.includes("run") && args.includes("test")) {
    return { stdout: "✓ Tests passed", stderr: "" };
  }
  if (cmd === "git" && args.includes("log")) {
    return {
      stdout: "feat: add new feature\n\nThis adds a new feature",
      stderr: "",
    };
  }

  throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
});

// Mock child_process to return our mocked execFile
const mockExecFile = mock(async (cmd: string, args: string[]) =>
  mockExecFileAsync(cmd, args),
);

mock.module("node:child_process", () => ({
  execFile: mockExecFile,
}));

// Mock util.promisify to return our mocked function
mock.module("node:util", () => ({
  promisify: mock((_fn: (...args: unknown[]) => void) => mockExecFileAsync),
}));

// Now import the service after mocks are set up
import { GhPRService } from "../../src/services/gh-pr-service.js";

// Mock require for package.json reading
const mockRequire = mock((path: string) => {
  if (path.endsWith("package.json")) {
    return {
      dependencies: {},
      devDependencies: {},
    };
  }
  return {};
});

// @ts-expect-error - mocking global require
spyOn(global, "require").mockImplementation(mockRequire);


describe("GhPRService", () => {
  let service: GhPRService;

  beforeEach(() => {
    service = new GhPRService();
    // Override execFileAsync for this service instance
    service.execFileAsync = mockExecFileAsync as typeof service.execFileAsync;
    mockExecFileAsync.mockClear();
    // Reset to default implementation
    mockExecFileAsync.mockImplementation(
      async (cmd: string, args: string[]) => {
        if (cmd === "which" && args[0] === "gh") {
          return { stdout: "/usr/local/bin/gh", stderr: "" };
        }
        if (cmd === "gh" && args[0] === "auth" && args[1] === "status") {
          return { stdout: "✓ Logged in to github.com", stderr: "" };
        }
        if (cmd === "gh" && args.includes("repo") && args.includes("view")) {
          return { stdout: "test/repo", stderr: "" };
        }
        if (
          cmd === "git" &&
          args.includes("rev-parse") &&
          args.includes("HEAD")
        ) {
          return { stdout: "main", stderr: "" };
        }
        if (
          cmd === "git" &&
          args.includes("status") &&
          args.includes("--porcelain")
        ) {
          return { stdout: "", stderr: "" };
        }
        if (cmd === "git" && args.includes("rev-list")) {
          return { stdout: "0", stderr: "" };
        }
        if (cmd === "which" && args[0] === "bun") {
          return { stdout: "/usr/local/bin/bun", stderr: "" };
        }
        if (cmd === "bun" && args.includes("run") && args.includes("lint")) {
          return { stdout: "✓ Linting passed", stderr: "" };
        }
        if (
          cmd === "bun" &&
          args.includes("run") &&
          (args.includes("format-check") || args.includes("format:check"))
        ) {
          return { stdout: "✓ Formatting passed", stderr: "" };
        }
        if (cmd === "bun" && args.includes("run") && args.includes("test")) {
          return { stdout: "✓ Tests passed", stderr: "" };
        }
        if (cmd === "git" && args.includes("log")) {
          return {
            stdout: "feat: add new feature\n\nThis adds a new feature",
            stderr: "",
          };
        }

        throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
      },
    );
  });

  afterEach(() => {
    mockExecFileAsync.mockReset();
  });

  describe("checkGitHubCliSetup", () => {
    test.serial("should return success when CLI is available and authenticated", async () => {
      const result = await Effect.runPromise(service.checkGitHubCliSetup());

      expect(result.cliAvailable).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.repository).toBe("test/repo");
    });

    test.serial("should return CLI not available when which fails", async () => {
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (cmd === "which" && args[0] === "gh") {
            throw new Error("Command not found");
          }
          // Call the original mock implementation for other commands
          return mockExecFileAsync(cmd, args);
        },
      );

      const result = await Effect.runPromise(service.checkGitHubCliSetup());

      expect(result.cliAvailable).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.repository).toBeUndefined();
    });

    test.serial("should return not authenticated when auth status fails", async () => {
      // First call (which gh) should succeed
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (cmd === "which" && args[0] === "gh") {
            return { stdout: "/usr/local/bin/gh", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );
      // Second call (gh auth status) should fail
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (cmd === "gh" && args[0] === "auth" && args[1] === "status") {
            throw new Error("Not authenticated");
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );

      const result = await Effect.runPromise(service.checkGitHubCliSetup());

      expect(result.cliAvailable).toBe(true);
      expect(result.authenticated).toBe(false);
      expect(result.repository).toBeUndefined();
    });
  });

  describe("validateGitState", () => {
    test.serial("should validate git state successfully", async () => {
      const result = await Effect.runPromise(service.validateGitState());

      expect(result.currentBranch).toBe("main");
      expect(result.hasChanges).toBe(false);
      expect(result.hasUncommittedChanges).toBe(false);
      expect(result.isOnMainBranch).toBe(true);
    });

    test.serial("should handle uncommitted changes", async () => {
      // First call (git rev-parse) should succeed
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (
            cmd === "git" &&
            args.includes("rev-parse") &&
            args.includes("HEAD")
          ) {
            return { stdout: "main", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );
      // Second call (git status) should return changes
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (
            cmd === "git" &&
            args.includes("status") &&
            args.includes("--porcelain")
          ) {
            return { stdout: "M file.txt\nA new-file.txt", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );

      const result = await Effect.runPromise(service.validateGitState());

      expect(result.hasUncommittedChanges).toBe(true);
    });

    test.serial("should handle commits ahead of origin", async () => {
      // First call (git rev-parse) should succeed
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (
            cmd === "git" &&
            args.includes("rev-parse") &&
            args.includes("HEAD")
          ) {
            return { stdout: "main", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );
      // Second call (git status) should return no changes
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (
            cmd === "git" &&
            args.includes("status") &&
            args.includes("--porcelain")
          ) {
            return { stdout: "", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );
      // Third call (git rev-list) should return commits ahead
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (cmd === "git" && args.includes("rev-list")) {
            return { stdout: "2", stderr: "" };
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );

      const result = await Effect.runPromise(service.validateGitState());

      expect(result.hasChanges).toBe(true);
    });
  });

  describe("detectPackageManager", () => {
    test.serial("should detect bun when bun.lockb exists", async () => {
      (existsSync as unknown as ReturnType<typeof mock>).mockImplementation(
        (path: string) => path.includes("bun.lockb"),
      );

      const result = await Effect.runPromise(service.detectPackageManager());

      expect(result).toBe("bun");
    });

    test.serial("should detect pnpm when pnpm-lock.yaml exists", async () => {
      (existsSync as unknown as ReturnType<typeof mock>).mockImplementation(
        (path: string) => path.includes("pnpm-lock.yaml"),
      );

      const result = await Effect.runPromise(service.detectPackageManager());

      expect(result).toBe("pnpm");
    });

    test.serial("should detect yarn when yarn.lock exists", async () => {
      (existsSync as unknown as ReturnType<typeof mock>).mockImplementation(
        (path: string) => path.includes("yarn.lock"),
      );

      const result = await Effect.runPromise(service.detectPackageManager());

      expect(result).toBe("yarn");
    });

    test.serial("should detect npm when package-lock.json exists", async () => {
      (existsSync as unknown as ReturnType<typeof mock>).mockImplementation(
        (path: string) => path.includes("package-lock.json"),
      );

      const result = await Effect.runPromise(service.detectPackageManager());

      expect(result).toBe("npm");
    });

    test.serial("should default to npm", async () => {
      (existsSync as unknown as ReturnType<typeof mock>).mockReturnValue(false);

      const result = await Effect.runPromise(service.detectPackageManager());

      expect(result).toBe("npm");
    });
  });

  describe("runQualityChecks", () => {
    test.serial("should run all quality checks successfully", async () => {
      const result = await Effect.runPromise(service.runQualityChecks("bun"));

      expect(result.lintPassed).toBe(true);
      expect(result.formatPassed).toBe(true);
      expect(result.testsPassed).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test.serial("should handle linting failure", async () => {
      mockExecFileAsync.mockImplementationOnce(
        async (cmd: string, args: string[]) => {
          if (cmd === "bun" && args.includes("lint")) {
            throw new Error("Linting failed");
          }
          // Call the original mock implementation for other commands
          return mockExecFileAsync(cmd, args);
        },
      );

      const result = await Effect.runPromise(service.runQualityChecks("bun"));

      expect(result.lintPassed).toBe(false);
      expect(result.formatPassed).toBe(true);
      expect(result.testsPassed).toBe(true);
      expect(result.errors).toContain("Linting failed: Error: Linting failed");
    });

    test.serial("should handle test failure", async () => {
      mockExecFileAsync.mockImplementation(
        async (cmd: string, args: string[]) => {
          if (cmd === "bun" && args.includes("lint")) {
            return { stdout: "✓ Linting passed", stderr: "" };
          }
          if (
            cmd === "bun" &&
            (args.includes("format-check") || args.includes("format:check"))
          ) {
            return { stdout: "✓ Formatting passed", stderr: "" };
          }
          if (cmd === "bun" && args.includes("test")) {
            throw new Error("Tests failed");
          }
          throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
        },
      );

      const result = await Effect.runPromise(service.runQualityChecks("bun"));

      expect(result.lintPassed).toBe(true);
      expect(result.formatPassed).toBe(true);
      expect(result.testsPassed).toBe(false);
      expect(result.errors).toContain("Tests failed: Error: Tests failed");
    });
  });

  describe("createPullRequest", () => {
    test.serial("should create a pull request", async () => {
      const options = {
        title: "Test PR",
        body: "Test body",
        base: "main",
        head: "feature-branch",
      };

      const result = await Effect.runPromise(
        service.createPullRequest(options),
      );

      expect(result.number).toBe(123);
      expect(result.url).toBe("https://github.com/test/repo/pull/123");
      expect(result.autoMergeEnabled).toBe(false);
    });
  });

  describe("getPRStatus", () => {
    test.serial("should get PR status", async () => {
      const result = await Effect.runPromise(service.getPRStatus(123));

      expect(result.isInMergeQueue).toBe(false);
      expect(result.mergeable).toBe(true);
      expect(result.mergeStateStatus).toBe("clean");
      expect(result.autoMergeEnabled).toBe(false);
    });
  });

  describe("listPRs", () => {
    test.serial("should list pull requests", async () => {
      const result = await Effect.runPromise(service.listPRs());

      expect(result).toContain("123");
      expect(result).toContain("124");
      expect(result).toContain("Test PR");
      expect(result).toContain("Another PR");
    });

    test.serial("should list PRs with options", async () => {
      const options = { state: "open" as const, author: "testuser" };

      const result = await Effect.runPromise(service.listPRs(options));

      expect(result).toContain("123");
      expect(result).toContain("Test PR");
    });
  });

  describe("viewPR", () => {
    test.serial("should view PR details", async () => {
      const result = await Effect.runPromise(service.viewPR(123));

      expect(result).toContain("PR #123");
      expect(result).toContain("Test PR");
      expect(result).toContain("State: open");
    });

    test.serial("should view PR with options", async () => {
      const options = { json: "true" };

      const result = await Effect.runPromise(service.viewPR("123", options));

      expect(result).toContain("PR #123");
    });
  });

  describe("mergePR", () => {
    test.serial("should merge a pull request", async () => {
      const result = await Effect.runPromise(service.mergePR(123));

      expect(result).toContain("Successfully merged PR #123");
    });

    test.serial("should merge PR with options", async () => {
      const options = { method: "squash" as const, deleteBranch: true };

      const result = await Effect.runPromise(service.mergePR(123, options));

      expect(result).toContain("Successfully merged PR #123");
    });
  });
});
