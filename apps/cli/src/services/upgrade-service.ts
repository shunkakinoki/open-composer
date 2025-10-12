import { realpath } from "node:fs/promises";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Information about how open-composer was installed */
export interface InstallInfo {
  /** The installation method detected */
  method: InstallMethod;
  /** The resolved path to the binary */
  binaryPath: string;
}

export type InstallMethod = "npm" | "binary" | "unknown";

// -----------------------------------------------------------------------------
// Main Functions
// -----------------------------------------------------------------------------

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