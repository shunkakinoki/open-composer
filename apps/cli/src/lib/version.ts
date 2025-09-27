import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_VERSION = (() => {
  try {
    // Try multiple paths to find package.json
    const paths = [
      // Relative to current file (development)
      new URL("../../package.json", import.meta.url),
      // Relative to executable directory (compiled)
      join(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
      // From current working directory
      join(process.cwd(), "package.json"),
      // From executable's directory
      join(dirname(process.execPath), "../package.json"),
    ];

    for (const path of paths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, "utf8"));
        if (typeof packageJson.version === "string") {
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
