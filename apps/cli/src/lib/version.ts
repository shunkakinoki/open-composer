// This file provides the CLI version, with automatic fallback to package.json
// if version.generated.ts doesn't exist yet.

import packageJson from "../../package.json" with { type: "json" };

let versionValue: string;

try {
  // Try to dynamically import the generated version (exists after build or when bundled)
  // Using string concatenation to prevent TypeScript from checking this import
  const generatedModule = await import(
    ("./version.generated" + ".js") as "./version.generated.js"
  );
  versionValue = generatedModule.CLI_VERSION;
} catch {
  // Fallback to package.json version (development/unbundled)
  versionValue = packageJson.version || "0.0.0";
}

export const CLI_VERSION = versionValue;
