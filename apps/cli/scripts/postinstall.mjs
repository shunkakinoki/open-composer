/** biome-ignore-all lint/style/useNodejsImportProtocol: For maintability */

import fs from "fs";
import { createRequire } from "module";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// -----------------------------------------------------------------------------
// Resolve package root – script can live in ./scripts during development
// -----------------------------------------------------------------------------

const packageRoot = fs.existsSync(path.join(__dirname, "bin"))
  ? __dirname
  : path.resolve(__dirname, "..");
const binDir = path.join(packageRoot, "bin");

// -----------------------------------------------------------------------------
// Helper: detect placeholder shell wrapper to allow binary replacement
// -----------------------------------------------------------------------------

function isStubBinary(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(2);
    const bytesRead = fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);

    if (bytesRead < 2) {
      return false;
    }

    const signature = buffer.toString("utf8", 0, bytesRead);
    return signature === "#!";
  } catch (_error) {
    // If we cannot inspect the file, assume it is not a stub so we do not overwrite it.
    return false;
  }
}

// -----------------------------------------------------------------------------
// Find the binary dynamically
// -----------------------------------------------------------------------------

function findBinary() {
  const platform = os.platform();
  const arch = os.arch();
  const binaryDirName = `cli-${platform}-${arch}`;
  const packageName = `@open-composer/${binaryDirName}`;
  const binary = platform === "win32" ? "open-composer.exe" : "open-composer";

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
  const isWindows = os.platform() === "win32";
  const binaryName = isWindows ? "open-composer.exe" : "open-composer";
  const destinationBinary = path.join(binDir, binaryName);

  // Skip if we already have a real binary (helps local development reuse builds)
  if (fs.existsSync(destinationBinary) && !isStubBinary(destinationBinary)) {
    console.log(
      `Binary already exists at ${destinationBinary} (development mode), skipping installation`,
    );
    return;
  }

  // Ensure bin directory exists before attempting to copy
  fs.mkdirSync(binDir, { recursive: true });

  let binaryPath;
  try {
    binaryPath = findBinary();
  } catch (error) {
    console.error(
      "Could not find platform-specific binary package:",
      error.message,
    );
    console.log(
      `This is expected in development. Make sure the binary exists at ${destinationBinary}`,
    );
    return;
  }

  // -----------------------------------------------------------------------------
  // Copy the binary to the bin directory
  // -----------------------------------------------------------------------------

  if (fs.existsSync(binaryPath)) {
    fs.copyFileSync(binaryPath, destinationBinary);
    if (!isWindows) {
      fs.chmodSync(destinationBinary, "755"); // Ensure executable permissions on Unix-like systems
    }
    console.log(`Installed binary: ${binaryPath} -> ${destinationBinary}`);

    // On Windows, ensure the .cmd wrapper exists and points to the .exe
    if (isWindows) {
      const cmdScriptPath = path.join(binDir, "open-composer.cmd");
      const cmdContent = `@ECHO OFF\r\n"%~dp0\\open-composer.exe" %*\r\n`;
      fs.writeFileSync(cmdScriptPath, cmdContent, { encoding: "utf8" });
      console.log("Updated open-composer.cmd wrapper for Windows");
    }
  } else {
    console.error(`No binary found at ${binaryPath}`);
    process.exit(1);
  }
}

installBinary();
