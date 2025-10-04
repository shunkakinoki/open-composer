import { readFileSync } from "node:fs";

// Try to import the generated version first
let generatedVersion: string | undefined;
try {
  // biome-ignore lint/suspicious/noTsIgnore: Not always generated
  // @ts-ignore - Generated file may not exist in development
  const gen = require("./version.generated.ts");
  generatedVersion = gen.CLI_VERSION;
} catch {
  // Will use fallback
}

export const CLI_VERSION = (() => {
  // If we have a generated version, use it
  if (generatedVersion) {
    return generatedVersion;
  }

  // Otherwise, try to read from package.json (development mode)
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    return packageJson.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
})();
