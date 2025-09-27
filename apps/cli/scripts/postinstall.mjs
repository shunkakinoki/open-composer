import { fs } from "node:fs";
import { os } from "node:os";
import { path } from "node:path";

// -----------------------------------------------------------------------------
// Install the binary
// -----------------------------------------------------------------------------

const platform = os.platform() === "win32" ? "windows" : os.platform();
const arch = os.arch();
const binaryName = platform === "windows" ? "opencomposer.exe" : "opencomposer";
const binaryPath = path.join(
  __dirname,
  "bin",
  `${platform}-${arch}`,
  binaryName,
);
const binScript = path.join(__dirname, "bin", "opencomposer");

// -----------------------------------------------------------------------------
// Copy the binary to the bin directory
// -----------------------------------------------------------------------------

if (fs.existsSync(binaryPath)) {
  fs.copyFileSync(binaryPath, binScript);
  fs.chmodSync(binScript, "755"); // Ensure executable permissions on Unix-like systems
  console.log(`Installed binary: ${binScript}`);
} else {
  console.error(`No binary found for ${platform}-${arch}`);
  process.exit(1);
}
