import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_VERSION = (() => {
  try {
    // Try multiple paths to find package.json
    const paths = [
      // From executable's parent directory (when installed via GitHub releases)
      join(dirname(process.execPath), "../package.json"),
      // Relative to executable directory (compiled)
      join(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
      // Relative to current file (development)
      new URL("../../package.json", import.meta.url),
      // From current working directory
      join(process.cwd(), "package.json"),
    ];

    for (const path of paths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, "utf8"));
        // Check if this is the right package.json by verifying the name
        if (
          typeof packageJson.version === "string" &&
          (packageJson.name === "open-composer" ||
            packageJson.name?.startsWith("@open-composer/cli-"))
        ) {
          return packageJson.version;
        }
      } catch {
        // Continue to next path
      }
    }

    return "0.0.0";
  } catch {
    return "0.0.0";
  }
})();
