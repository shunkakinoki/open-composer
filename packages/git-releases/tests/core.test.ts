import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as Effect from "effect/Effect";
import { GitHubReleases, makeGitHubReleasesLive } from "../src/core.js";

// Mock the global fetch function
const originalFetch = global.fetch;

describe("GitHubReleases service", () => {
  const testConfig = {
    owner: "shunkakinoki",
    repo: "open-composer",
    packageName: "open-composer",
  };

  // Mock data for GitHub API responses
  const mockLatestReleaseResponse = {
    tag_name: "open-composer@0.8.3",
    name: "Release 0.8.3",
    body: "Release notes for 0.8.3",
    html_url:
      "https://github.com/shunkakinoki/open-composer/releases/tag/open-composer@0.8.3",
    published_at: "2024-01-01T00:00:00Z",
    assets: [
      {
        name: "open-composer-cli-linux-x64.zip",
        browser_download_url:
          "https://github.com/shunkakinoki/open-composer/releases/download/open-composer@0.8.3/open-composer-cli-linux-x64.zip",
        size: 123456,
        content_type: "application/zip",
      },
    ],
  };

  const mockReleasesResponse = [
    mockLatestReleaseResponse,
    {
      tag_name: "open-composer@0.8.2",
      name: "Release 0.8.2",
      body: "Release notes for 0.8.2",
      html_url:
        "https://github.com/shunkakinoki/open-composer/releases/tag/open-composer@0.8.2",
      published_at: "2024-01-01T00:00:00Z",
      assets: [],
    },
    {
      tag_name: "open-composer@0.8.1",
      name: "Release 0.8.1",
      body: "Release notes for 0.8.1",
      html_url:
        "https://github.com/shunkakinoki/open-composer/releases/tag/open-composer@0.8.1",
      published_at: "2024-01-01T00:00:00Z",
      assets: [],
    },
  ];

  beforeEach(() => {
    // Mock fetch to return our test data
    const mockFetch = mock(async (url: string | URL | Request) => {
      const urlString = typeof url === "string" ? url : url.toString();

      // Handle invalid repositories
      if (urlString.includes("nonexistent")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response;
      }

      if (urlString.includes("/releases/latest")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(mockLatestReleaseResponse),
        } as Response;
      }

      if (urlString.includes("/releases?")) {
        // Handle pagination
        const urlObj = new URL(urlString);
        const page = parseInt(urlObj.searchParams.get("page") || "1", 10);
        const perPage = parseInt(
          urlObj.searchParams.get("per_page") || "30",
          10,
        );

        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedReleases = mockReleasesResponse.slice(
          startIndex,
          endIndex,
        );

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(paginatedReleases),
        } as Response;
      }

      if (urlString.includes("/releases/tags/")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(mockLatestReleaseResponse),
        } as Response;
      }

      // Return 404 for unknown URLs
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response;
    });

    global.fetch = Object.assign(mockFetch, {
      preconnect: () => {},
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe("getLatestRelease", () => {
    test("should fetch the latest release", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        const release = yield* service.getLatestRelease();

        expect(release).toBeDefined();
        expect(release.tagName).toBeDefined();
        expect(release.version).toBeDefined();
        expect(release.name).toBeDefined();
        expect(release.url).toBeDefined();
        expect(release.publishedAt).toBeDefined();
        expect(Array.isArray(release.assets)).toBe(true);

        return release;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeGitHubReleasesLive(testConfig))),
      );

      expect(result).toBeDefined();
    });

    test("should handle package name prefix in tag", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        const release = yield* service.getLatestRelease();

        // Version should not have the package name prefix
        expect(release.version).not.toContain("@");
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeGitHubReleasesLive(testConfig))),
      );
    });
  });

  describe("getLatestVersion", () => {
    test("should return the latest version string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        const version = yield* service.getLatestVersion();

        expect(typeof version).toBe("string");
        expect(version.length).toBeGreaterThan(0);
        // Should match semver format (basic check)
        expect(version).toMatch(/^\d+\.\d+\.\d+/);
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeGitHubReleasesLive(testConfig))),
      );
    });
  });

  describe("listReleases", () => {
    test("should list releases", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        const releases = yield* service.listReleases({ perPage: 5 });

        expect(Array.isArray(releases)).toBe(true);
        expect(releases.length).toBeGreaterThan(0);
        expect(releases.length).toBeLessThanOrEqual(5);

        // Check first release structure
        const firstRelease = releases[0];
        expect(firstRelease?.tagName).toBeDefined();
        expect(firstRelease?.version).toBeDefined();
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeGitHubReleasesLive(testConfig))),
      );
    });

    test("should support pagination", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        const page1 = yield* service.listReleases({ page: 1, perPage: 2 });
        const page2 = yield* service.listReleases({ page: 2, perPage: 2 });

        expect(page1.length).toBeLessThanOrEqual(2);
        expect(page2.length).toBeLessThanOrEqual(2);

        // Pages should be different (if enough releases exist)
        if (page1.length > 0 && page2.length > 0) {
          expect(page1[0]?.tagName).not.toBe(page2[0]?.tagName);
        }
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeGitHubReleasesLive(testConfig))),
      );
    });
  });

  describe("error handling", () => {
    test("should handle invalid repository", async () => {
      const invalidConfig = {
        owner: "nonexistent",
        repo: "nonexistent-repo-12345",
      };

      const program = Effect.gen(function* () {
        const service = yield* GitHubReleases;
        yield* service.getLatestRelease();
      });

      const result = Effect.runPromiseExit(
        program.pipe(Effect.provide(makeGitHubReleasesLive(invalidConfig))),
      );

      const exit = await result;
      expect(exit._tag).toBe("Failure");
    });
  });
});
