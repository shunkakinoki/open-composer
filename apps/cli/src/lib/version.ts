// Read version from package.json directly
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || "0.0.0";
  } catch {
    // Fallback to default version if package.json can't be read
    return "0.0.0";
  }
}

export const CLI_VERSION = readVersion();
