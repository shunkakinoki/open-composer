// GitHub Releases API
export {
  GitHubReleases,
  type GitHubReleasesConfig,
  type GitHubReleasesError,
  type GitHubReleasesService,
  makeGitHubReleasesLive,
  type ReleaseAsset,
  type ReleaseInfo,
} from "./core.js";

// Version comparison
export {
  compareVersions,
  compareVersionsEffect,
  isLatestVersion,
  isLatestVersionEffect,
  isNewerThanLatest,
  isNewerThanLatestEffect,
  isUpdateAvailable,
  isUpdateAvailableEffect,
  type VersionComparison,
} from "./version.js";
