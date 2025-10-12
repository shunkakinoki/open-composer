import {
  chmod,
  mkdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { arch, homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { Args, Command, Options } from "@effect/cli";
import {
  compareVersions,
  GitHubReleases,
  makeGitHubReleasesLive,
} from "@open-composer/git-releases";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import { CLI_VERSION } from "../lib/version.js";
import { trackFeatureUsage } from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GITHUB_OWNER = "shunkakinoki";
const GITHUB_REPO = "open-composer";
const PACKAGE_NAME = "open-composer";
const INSTALL_DIR = join(homedir(), ".open-composer");
const BIN_DIR = join(homedir(), ".local", "bin");

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UpgradeError {
  readonly _tag: "UpgradeError";
  readonly message: string;
  readonly cause: unknown;
}

const makeUpgradeError = (params: {
  readonly message: string;
  readonly cause: unknown;
}): UpgradeError => {
  return {
    _tag: "UpgradeError",
    message: params.message,
    cause: params.cause,
  };
};

type InstallMethod = "npm" | "binary" | "unknown";

interface InstallInfo {
  method: InstallMethod;
  binaryPath: string;
}

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildUpgradeCommand(): CommandBuilder<"upgrade"> {
  return {
    command: () => upgradeCommand,
    metadata: {
      name: "upgrade",
      description: "Upgrade to the latest version",
    },
  };
}

// Export internal function for testing
export { detectInstallMethod };

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Detect how open-composer was installed by checking the binary path.
 *
 * npm global installs typically go to:
 * - /usr/local/bin (macOS/Linux)
 * - ~/.npm-global/bin
 * - C:\Users\{user}\AppData\Roaming\npm (Windows)
 *
 * Binary installs go to:
 * - ~/.local/bin
 */
async function detectInstallMethod(): Promise<InstallInfo> {
  try {
    // Get the path to the currently running binary
    // For Bun-compiled binaries, process.argv[1] is "/$bunfs/root/binary-name"
    // so we need to use process.execPath instead
    let binaryPath = process.argv[1];

    if (binaryPath?.startsWith("/$bunfs/")) {
      // This is a Bun-compiled binary, use the actual executable path
      binaryPath = process.execPath;
    }

    if (!binaryPath) {
      return { method: "unknown", binaryPath: "" };
    }

    // Resolve symlinks to get the actual binary location
    const realBinaryPath = await realpath(binaryPath);

    // Check if it's in typical npm global directories
    if (
      realBinaryPath.includes("/npm/") ||
      realBinaryPath.includes("\\npm\\") ||
      realBinaryPath.includes("/node_modules/") ||
      realBinaryPath.includes("\\node_modules\\") ||
      realBinaryPath.includes(".npm-global") ||
      realBinaryPath.includes("/usr/local/lib/node_modules/")
    ) {
      return { method: "npm", binaryPath: realBinaryPath };
    }

    // Check if it's in ~/.local/bin or similar binary install locations
    if (
      realBinaryPath.includes(".local/bin") ||
      realBinaryPath.includes(".open-composer")
    ) {
      return { method: "binary", binaryPath: realBinaryPath };
    }

    // Default to binary if we can't determine
    return { method: "binary", binaryPath: realBinaryPath };
  } catch {
    return { method: "unknown", binaryPath: "" };
  }
}

// -----------------------------------------------------------------------------
// Platform Detection
// -----------------------------------------------------------------------------

/**
 * Detect the current platform and architecture
 */
function detectPlatform(): string {
  const os = platform();
  const cpuArch = arch();

  let platformStr: string;
  switch (os) {
    case "linux":
      platformStr = "linux";
      break;
    case "darwin":
      platformStr = "darwin";
      break;
    case "win32":
      platformStr = "windows";
      break;
    default:
      throw new Error(`Unsupported operating system: ${os}`);
  }

  let archStr: string;
  switch (cpuArch) {
    case "x64":
      archStr = "x64";
      break;
    case "arm64":
      archStr = "arm64";
      break;
    default:
      throw new Error(`Unsupported architecture: ${cpuArch}`);
  }

  return `${platformStr}-${archStr}`;
}

/**
 * Map platform string to GitHub release binary name
 */
function getBinaryName(platformStr: string): string {
  switch (platformStr) {
    case "linux-x64":
      return "open-composer-cli-linux-x64";
    case "linux-arm64":
      return "open-composer-cli-linux-aarch64-musl";
    case "darwin-x64":
      return "open-composer-cli-darwin-x64";
    case "darwin-arm64":
      return "open-composer-cli-darwin-arm64";
    case "windows-x64":
      return "open-composer-cli-win32-x64";
    case "windows-arm64":
      return "open-composer-cli-win32-arm64";
    default:
      throw new Error(`Unsupported platform: ${platformStr}`);
  }
}

// -----------------------------------------------------------------------------
// Upgrade Functions
// -----------------------------------------------------------------------------

/**
 * Upgrade via npm - preserves the npm installation
 */
const upgradeViaNpm = (version: string): Effect.Effect<void, UpgradeError> =>
  Effect.tryPromise({
    try: async () => {
      const { spawn } = await import("node:child_process");
      const packageSpec = `${PACKAGE_NAME}@${version}`;

      console.log(`Upgrading via npm to ${packageSpec}...`);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn("npm", ["install", "-g", packageSpec], {
          stdio: "inherit",
        });
        proc.on("error", reject);
        proc.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `npm install failed with exit code ${code ?? "unknown"}`,
              ),
            );
          }
        });
      });

      console.log(`✓ Successfully upgraded via npm`);
    },
    catch: (error) => {
      return makeUpgradeError({
        message: `Failed to upgrade via npm: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    },
  });

/**
 * Download and install the binary from GitHub releases.
 * Replaces the existing binary at its current location.
 */
const upgradeFromGitHub = (
  version: string,
  installInfo: InstallInfo,
): Effect.Effect<void, UpgradeError> =>
  Effect.tryPromise({
    try: async () => {
      const platformStr = detectPlatform();
      const binaryName = getBinaryName(platformStr);

      // Determine target directory
      const targetBinary =
        installInfo.binaryPath || join(BIN_DIR, "open-composer");
      const targetDir = dirname(targetBinary);

      // Create directories
      await mkdir(INSTALL_DIR, { recursive: true });
      await mkdir(targetDir, { recursive: true });

      // Download URL
      const downloadUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${PACKAGE_NAME}@${version}/${binaryName}.zip`;
      const zipPath = join(INSTALL_DIR, `${binaryName}.zip`);

      console.log(`Downloading from ${downloadUrl}...`);

      // Download the binary
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download binary: ${response.status} ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write to file
      await writeFile(zipPath, buffer);

      console.log("Extracting files...");

      // Extract using unzip
      const { spawn } = await import("node:child_process");
      await new Promise<void>((resolve, reject) => {
        const proc = spawn("unzip", ["-q", "-o", zipPath, "-d", INSTALL_DIR], {
          stdio: "inherit",
        });
        proc.on("error", reject);
        proc.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `Failed to extract binary: unzip exited with code ${code ?? "unknown"}`,
              ),
            );
          }
        });
      });

      // Move binary to target location (overwriting existing)
      // The binary is extracted to a nested path in the zip: @open-composer/cli-${platformStr}/bin/open-composer[.exe]
      const packageDir = `@open-composer/cli-${platformStr}`;
      const extractedBinaryName = platformStr.startsWith("windows")
        ? "open-composer.exe"
        : "open-composer";
      const extractedBinary = join(
        INSTALL_DIR,
        packageDir,
        "bin",
        extractedBinaryName,
      );

      // Remove old binary if it exists
      try {
        await rm(targetBinary, { force: true });
      } catch {
        // Ignore if doesn't exist
      }

      await rename(extractedBinary, targetBinary);
      await chmod(targetBinary, 0o755);

      // Cleanup
      await rm(zipPath, { force: true });

      console.log(`✓ Installed to ${targetBinary}`);
    },
    catch: (error) => {
      return makeUpgradeError({
        message: `Failed to upgrade binary: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    },
  });

// -----------------------------------------------------------------------------
// Options & Args
// -----------------------------------------------------------------------------

const checkOption = Options.boolean("check").pipe(
  Options.withAlias("c"),
  Options.withDescription("Check for updates without installing"),
);

const forceOption = Options.boolean("force").pipe(
  Options.withAlias("f"),
  Options.withDescription("Force upgrade even if already on latest version"),
);

const versionArg = Args.text({ name: "version" }).pipe(
  Args.optional,
  Args.withDescription("Specific version to upgrade to (optional)"),
);

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

const upgradeCommand = Command.make("upgrade", {
  check: checkOption,
  force: forceOption,
  version: versionArg,
}).pipe(
  Command.withDescription("Upgrade open-composer to the latest version"),
  Command.withHandler(({ check, force, version }) =>
    Effect.gen(function* () {
      const versionValue = version?._tag === "Some" ? version.value : undefined;

      yield* trackFeatureUsage("upgrade_command_started", {
        check_only: check,
        force,
        target_version: versionValue || "latest",
      });

      const releases = yield* GitHubReleases;

      // Get latest version from GitHub
      const latestVersion = yield* releases.getLatestVersion();
      const currentVersion = CLI_VERSION;

      yield* Console.log(`Current version: ${currentVersion}`);
      yield* Console.log(`Latest version:  ${latestVersion}`);

      const comparison = compareVersions(currentVersion, latestVersion);

      if (comparison === 0 && !force) {
        yield* Console.log("\n✓ You are already running the latest version!");
        yield* trackFeatureUsage("upgrade_command_completed", {
          already_latest: true,
          version: currentVersion,
        });
        return;
      }

      if (comparison > 0 && !force) {
        yield* Console.log(
          "\n⚠ You are running a newer version than the latest release.",
        );
        yield* trackFeatureUsage("upgrade_command_completed", {
          newer_than_latest: true,
          current: currentVersion,
          latest: latestVersion,
        });
        return;
      }

      if (force && comparison === 0) {
        yield* Console.log(
          "\n⚠ Forcing upgrade even though you are already on the latest version.",
        );
      }

      // If check-only mode, just report the availability
      if (check) {
        yield* Console.log(`\n↑ A new version is available: ${latestVersion}`);
        yield* Console.log(`  Run 'open-composer upgrade' to update.`);
        yield* trackFeatureUsage("upgrade_command_completed", {
          check_only: true,
          update_available: true,
          latest: latestVersion,
        });
        return;
      }

      // Detect installation method
      const installInfo = yield* Effect.promise(() => detectInstallMethod());

      yield* Console.log(`Detected installation method: ${installInfo.method}`);
      if (installInfo.binaryPath) {
        yield* Console.log(
          `Current binary location: ${installInfo.binaryPath}`,
        );
      }

      // Perform the upgrade
      const targetVersion = versionValue || latestVersion;

      yield* Console.log(`\nUpgrading to ${PACKAGE_NAME}@${targetVersion}...`);

      // Use the appropriate upgrade method
      if (installInfo.method === "npm") {
        yield* Console.log(
          "Using npm upgrade method to preserve your npm installation...",
        );
        yield* upgradeViaNpm(targetVersion);
      } else {
        yield* Console.log("Using binary upgrade method...");
        yield* upgradeFromGitHub(targetVersion, installInfo);
      }

      yield* Console.log(
        `\n✓ Successfully upgraded to version ${targetVersion}!`,
      );
      yield* Console.log("  Run 'open-composer --version' to verify.");

      yield* trackFeatureUsage("upgrade_command_completed", {
        success: true,
        from_version: currentVersion,
        to_version: targetVersion,
        install_method: installInfo.method,
        force,
      });
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* trackFeatureUsage("upgrade_command_failed", {
            error: String(error),
          });
          return yield* Effect.fail(error);
        }),
      ),
      Effect.provide(
        makeGitHubReleasesLive({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          packageName: PACKAGE_NAME,
        }),
      ),
      Effect.withSpan("upgrade_command", {
        attributes: {
          check,
          force,
          version: version?._tag === "Some" ? version.value : undefined,
        },
      }),
    ),
  ),
);
