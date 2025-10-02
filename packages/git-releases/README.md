# @open-composer/git-releases

GitHub Releases API client and version comparison utilities built with Effect.

## Features

- 🚀 Fetch latest releases from GitHub repositories
- 📦 Version comparison utilities
- 🛡️ Type-safe with Effect-based error handling
- ✅ Fully tested

## Philosophy

This package focuses solely on GitHub Releases API interactions and version comparison logic. Package upgrade/installation logic is intentionally kept separate (in the CLI) to maintain clean separation of concerns.

## Installation

```bash
bun add @open-composer/git-releases
```

## Usage

### GitHub Releases API

```typescript
import { GitHubReleases, makeGitHubReleasesLive } from "@open-composer/git-releases";
import * as Effect from "effect/Effect";

const program = Effect.gen(function* () {
  const releases = yield* GitHubReleases;

  // Get latest release
  const latest = yield* releases.getLatestRelease();
  console.log(latest.version);

  // Get latest version string
  const version = yield* releases.getLatestVersion();
  console.log(version);

  // List releases with pagination
  const allReleases = yield* releases.listReleases({ page: 1, perPage: 10 });

  // Get specific release by tag
  const specific = yield* releases.getReleaseByTag("v1.0.0");
});

const layer = makeGitHubReleasesLive({
  owner: "shunkakinoki",
  repo: "open-composer",
  packageName: "open-composer", // optional - removes this prefix from version strings
});

Effect.runPromise(program.pipe(Effect.provide(layer)));
```

### Version Comparison

```typescript
import { compareVersions, isUpdateAvailable } from "@open-composer/git-releases";

// Compare two versions
const result = compareVersions("1.0.0", "2.0.0"); // returns -1
const isEqual = compareVersions("1.0.0", "1.0.0"); // returns 0
const isNewer = compareVersions("2.0.0", "1.0.0"); // returns 1

// Check if update is available
if (isUpdateAvailable("1.0.0", "2.0.0")) {
  console.log("Update available!");
}
```

## API

### Types

#### `ReleaseInfo`
```typescript
interface ReleaseInfo {
  readonly tagName: string;
  readonly version: string;
  readonly name: string;
  readonly body: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly assets: ReadonlyArray<ReleaseAsset>;
}
```

#### `GitHubReleasesService`
```typescript
interface GitHubReleasesService {
  readonly getLatestRelease: () => Effect.Effect<ReleaseInfo, GitHubReleasesError>;
  readonly getLatestVersion: () => Effect.Effect<string, GitHubReleasesError>;
  readonly getReleaseByTag: (tag: string) => Effect.Effect<ReleaseInfo, GitHubReleasesError>;
  readonly listReleases: (params?: {
    readonly page?: number;
    readonly perPage?: number;
  }) => Effect.Effect<ReadonlyArray<ReleaseInfo>, GitHubReleasesError>;
}
```

### Version Utilities

- `compareVersions(current: string, target: string): VersionComparison` - Compare two semver versions
- `isUpdateAvailable(current: string, latest: string): boolean` - Check if update is available
- `isNewerThanLatest(current: string, latest: string): boolean` - Check if current is newer
- `isLatestVersion(current: string, latest: string): boolean` - Check if versions match

## Testing

```bash
bun test
```

## License

MIT
