/** biome-ignore-all lint/style/useNodejsImportProtocol: For maintability */

import fs from "fs";
import { createRequire } from "module";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// -----------------------------------------------------------------------------
// Find the binary dynamically
// -----------------------------------------------------------------------------

function findBinary() {
  const platform = os.platform() === "win32" ? "windows" : os.platform();
  const arch = os.arch();
  const binaryDirName = `cli-${platform}-${arch}`;
  const packageName = `@open-composer/${binaryDirName}`;
  const binary = platform === "windows" ? "opencomposer.exe" : "opencomposer";

  try {
    // Use require.resolve to find the package
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    const binaryPath = path.join(packageDir, "bin", binary);

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found at ${binaryPath}`);
    }

    return binaryPath;
  } catch (error) {
    throw new Error(`Could not find package ${packageName}: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Install the binary
// -----------------------------------------------------------------------------

const binaryPath = findBinary();
const binScript = path.join(__dirname, "bin", "opencomposer");

// -----------------------------------------------------------------------------
// Copy the binary to the bin directory
// -----------------------------------------------------------------------------

if (fs.existsSync(binaryPath)) {
  fs.copyFileSync(binaryPath, binScript);
  fs.chmodSync(binScript, "755"); // Ensure executable permissions on Unix-like systems
  console.log(`Installed binary: ${binScript} -> ${binaryPath}`);
} else {
  console.error(`No binary found at ${binaryPath}`);
  process.exit(1);
}
