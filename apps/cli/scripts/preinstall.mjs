/** biome-ignore-all lint/style/useNodejsImportProtocol: For maintability */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// -----------------------------------------------------------------------------
// Set the __dirname
// -----------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Main function
// -----------------------------------------------------------------------------

function main() {
  if (os.platform() !== "win32") {
    console.log(
      "Non-Windows platform detected, skipping preinstall opencomposer.cmd",
    );
    return;
  }

  console.log("Windows detected: Setting up opencomposer.cmd");
  const cmdScriptPath = path.join(__dirname, "bin", "opencomposer.cmd");

  // ---------------------------------------------------------------------------
  // Ensure the .cmd wrapper exists (create a minimal one if needed)
  // ---------------------------------------------------------------------------

  const cmdContent = `@ECHO OFF\nnode "${path.join(__dirname, "bin", "opencomposer.js")}" %*\n`;
  fs.writeFileSync(cmdScriptPath, cmdContent, { encoding: "utf8" });
  console.log("Created opencomposer.cmd wrapper for Windows");
}

// -----------------------------------------------------------------------------
// Try to run the main function
// -----------------------------------------------------------------------------

try {
  main();
} catch (error) {
  console.error("Preinstall script error:", error.message);
  process.exit(0);
}
