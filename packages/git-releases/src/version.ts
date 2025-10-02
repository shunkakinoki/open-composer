import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type VersionComparison = -1 | 0 | 1;

// -----------------------------------------------------------------------------
// Version Comparison
// -----------------------------------------------------------------------------

/**
 * Compare two semantic versions.
 * @returns -1 if current < target, 0 if equal, 1 if current > target
 */
export function compareVersions(
  current: string,
  target: string,
): VersionComparison {
  const currentParts = current.split(".").map(Number);
  const targetParts = target.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, targetParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const targetPart = targetParts[i] || 0;

    if (currentPart < targetPart) return -1;
    if (currentPart > targetPart) return 1;
  }

  return 0;
}

/**
 * Check if an update is available for the given current version.
 */
export const isUpdateAvailable = (
  currentVersion: string,
  latestVersion: string,
): boolean => compareVersions(currentVersion, latestVersion) === -1;

/**
 * Check if the current version is newer than the latest release.
 */
export const isNewerThanLatest = (
  currentVersion: string,
  latestVersion: string,
): boolean => compareVersions(currentVersion, latestVersion) === 1;

/**
 * Check if the current version is the latest.
 */
export const isLatestVersion = (
  currentVersion: string,
  latestVersion: string,
): boolean => compareVersions(currentVersion, latestVersion) === 0;

// -----------------------------------------------------------------------------
// Effect-based API
// -----------------------------------------------------------------------------

export const compareVersionsEffect = (
  current: string,
  target: string,
): Effect.Effect<VersionComparison> =>
  Effect.sync(() => compareVersions(current, target));

export const isUpdateAvailableEffect = (
  currentVersion: string,
  latestVersion: string,
): Effect.Effect<boolean> =>
  Effect.sync(() => isUpdateAvailable(currentVersion, latestVersion));

export const isNewerThanLatestEffect = (
  currentVersion: string,
  latestVersion: string,
): Effect.Effect<boolean> =>
  Effect.sync(() => isNewerThanLatest(currentVersion, latestVersion));

export const isLatestVersionEffect = (
  currentVersion: string,
  latestVersion: string,
): Effect.Effect<boolean> =>
  Effect.sync(() => isLatestVersion(currentVersion, latestVersion));
