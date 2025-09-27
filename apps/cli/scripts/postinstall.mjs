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
  const platform = os.platform();
  const arch = os.arch();
  const binaryDirName = `cli-${platform}-${arch}`;
  const packageName = `@open-composer/${binaryDirName}`;
  const binary = platform === "win32" ? "opencomposer.exe" : "opencomposer";

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

function installBinary() {
  // In development, the platform-specific packages might not exist
  // Check if binary already exists in bin directory
  const existingBinary = path.join(__dirname, "bin", "opencomposer");
  if (fs.existsSync(existingBinary)) {
    console.log(
      "Binary already exists in bin directory (development mode), skipping installation",
    );
    return;
  }

  let binaryPath;
  try {
    binaryPath = findBinary();
  } catch (error) {
    console.error(
      "Could not find platform-specific binary package:",
      error.message,
    );
    console.log(
      "This is expected in development. Make sure the binary exists in bin/opencomposer",
    );
    return;
  }

  const isWindows = os.platform() === "win32";
  const binScript = path.join(
    __dirname,
    "bin",
    isWindows ? "opencomposer.exe" : "opencomposer",
  );

  // -----------------------------------------------------------------------------
  // Copy the binary to the bin directory
  // -----------------------------------------------------------------------------

  if (fs.existsSync(binaryPath)) {
    fs.copyFileSync(binaryPath, binScript);
    if (!isWindows) {
      fs.chmodSync(binScript, "755"); // Ensure executable permissions on Unix-like systems
    }
    console.log(`Installed binary: ${binScript} -> ${binaryPath}`);

    // On Windows, ensure the .cmd wrapper exists and points to the .exe
    if (isWindows) {
      const cmdScriptPath = path.join(__dirname, "bin", "opencomposer.cmd");
      const cmdContent = `@ECHO OFF\n"${binScript}" %*\n`;
      fs.writeFileSync(cmdScriptPath, cmdContent, { encoding: "utf8" });
      console.log("Updated opencomposer.cmd wrapper for Windows");
    }
  } else {
    console.error(`No binary found at ${binaryPath}`);
    process.exit(1);
  }
}

installBinary();
