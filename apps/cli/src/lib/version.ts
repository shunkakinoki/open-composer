// Import the generated version directly
import { CLI_VERSION as generatedVersion } from "./version.generated.js";

// Export the generated version, with fallback to package.json if needed
export const CLI_VERSION = generatedVersion || "0.0.0";
