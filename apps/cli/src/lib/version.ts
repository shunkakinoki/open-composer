import { readFileSync } from "node:fs";

// Try to import the generated version first
let generatedVersion: string | undefined;
try {
  const content = readFileSync(
    new URL("./version.generated.ts", import.meta.url),
    "utf8",
  );
  const versionMatch = content.match(/export const CLI_VERSION = "([^"]+)"/);
  if (versionMatch?.[1]) {
    generatedVersion = versionMatch[1];
  }
} catch {
  // Generated file may not exist in development, will use fallback.
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
