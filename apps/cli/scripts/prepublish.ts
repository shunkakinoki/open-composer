#!/usr/bin/env bun
/// <reference types="bun-types" />

import { $ } from "bun";

// -----------------------------------------------------------------------------
// Generate version file first
// -----------------------------------------------------------------------------

console.log("Generating version file...");
await $`bun run scripts/generate-version.ts`;

// Import version after generation
const { CLI_VERSION } = await import("../src/lib/version.js");

// -----------------------------------------------------------------------------
// Set the flags
// -----------------------------------------------------------------------------

console.log(`CI: ${process.env.CI}`);
console.log(`PUBLISH_PACKAGES: ${process.env.PUBLISH_PACKAGES}`);
console.log(`RELEASE_ZIP_FILES: ${process.env.RELEASE_ZIP_FILES}`);
console.log(`GITHUB_SHA: ${process.env.GITHUB_SHA}`);

// Use snapshot tag for changeset releases (Version Packages PR merges)
const isRelease =
  process.env.CI === "true" &&
  process.env.PUBLISH_PACKAGES === "true" &&
  process.env.GITHUB_SHA !== undefined;

console.log(`isRelease: ${isRelease}`);

// -----------------------------------------------------------------------------
// Set the metadata
// -----------------------------------------------------------------------------

console.log(`CLI_VERSION: ${CLI_VERSION}`);

// -----------------------------------------------------------------------------
// Set the targets
// -----------------------------------------------------------------------------

const targets = [
  ["win32", "x64"],
  ["win32", "x64-baseline"],
  ["linux", "arm64"],
  ["linux", "aarch64-musl"],
  ["linux", "x64"],
  ["linux", "x64-baseline"],
  ["linux", "x64-musl"],
  ["linux", "x64-musl-baseline"],
  ["darwin", "x64"],
  ["darwin", "x64-baseline"],
  ["darwin", "arm64"],
];

// -----------------------------------------------------------------------------
// Map platform and arch to Bun target strings
// -----------------------------------------------------------------------------

function getBunTarget(os: string, arch: string): string {
  const archMap: Record<string, string> = {
    x64: "x64",
    "x64-baseline": "x64",
    arm64: "arm64",
  };

  const platformMap: Record<string, string> = {
    win32: "windows",
    linux: "linux",
    darwin: "darwin",
  };

  const targetArch = archMap[arch] || arch;
  const targetPlatform = platformMap[os] || os;

  return `bun-${targetPlatform}-${targetArch}`;
}

// -----------------------------------------------------------------------------
// Set the binaries
// -----------------------------------------------------------------------------

const binaries: Record<string, string> = {};
// Parse version to handle formats like "open-composer@0.1.0" -> "0.1.0"
const versionString = String(CLI_VERSION);
const version = versionString.includes("@")
  ? versionString.split("@")[1]
  : versionString;
console.log(`Building CLI version ${version}`);

// -----------------------------------------------------------------------------
// Set the __dirname
// -----------------------------------------------------------------------------

process.chdir(new URL("..", import.meta.url).pathname);

// -----------------------------------------------------------------------------
// Build for all target platforms using cross-compilation
// -----------------------------------------------------------------------------

for (const [os, arch] of targets) {
  const packageName = `@open-composer/cli-${os}-${arch}`;
  const bunTarget = getBunTarget(os, arch);

  console.log(`Building for ${os}-${arch} using target: ${bunTarget}`);

  await $`mkdir -p dist/${packageName}/bin`;

  // ---------------------------------------------------------------------------
  // Use bun build with cross-compilation
  // ---------------------------------------------------------------------------

  const binaryName = os === "win32" ? "open-composer.exe" : "open-composer";
  await $`bun build --compile --target=${bunTarget} ./src/index.ts --outfile dist/${packageName}/bin/${binaryName}`;

  // Make executable on Unix systems
  if (os !== "win32") {
    await $`chmod +x dist/${packageName}/bin/open-composer`;
  }

  await Bun.write(
    `dist/${packageName}/package.json`,
    JSON.stringify(
      {
        name: packageName,
        version: String(CLI_VERSION),
        main: `bin/${binaryName}`,
        os: [os === "win32" ? "win32" : os],
        cpu: [arch],
        bin: {
          oc: `bin/${binaryName}`,
          opencomposer: `bin/${binaryName}`,
          "open-composer": `bin/${binaryName}`,
        },
      },
      null,
      2,
    ),
  );

  // ---------------------------------------------------------------------------
  // Add the package to the binaries object
  // ---------------------------------------------------------------------------

  binaries[packageName] = String(CLI_VERSION);
}

console.log(`Binaries built: ${JSON.stringify(binaries)}`);

// -----------------------------------------------------------------------------
// Create zip file for the package if `RELEASE_ZIP_FILES` is set
// -----------------------------------------------------------------------------

if (process.env.RELEASE_ZIP_FILES) {
  for (const [packageName] of Object.entries(binaries)) {
    console.log(`Creating zip for ${packageName}`);

    const zipName = `open-composer-${packageName.split("/")[1]}.zip`;
    console.log(`Creating zip: ${zipName}`);

    // Create zip file containing the entire package directory
    await $`cd dist && zip -r ${zipName} ${packageName}`;

    console.log(`Built and zipped: ${packageName}`);
  }
}

// -----------------------------------------------------------------------------
// Prepare the main package if `isRelease` is set
// -----------------------------------------------------------------------------

if (isRelease) {
  // ---------------------------------------------------------------------------
  // Set the __dirname
  // ---------------------------------------------------------------------------

  const dir = new URL("..", import.meta.url).pathname;
  process.chdir(dir);

  // ---------------------------------------------------------------------------
  // Copy the binary to the dist directory and copy the required scripts
  // ---------------------------------------------------------------------------

  await $`cp ./scripts/preinstall.mjs ./preinstall.mjs`;
  await $`cp ./scripts/postinstall.mjs ./postinstall.mjs`;
  await Bun.file(`./package.json`).write(
    JSON.stringify(
      {
        name: "open-composer",
        bin: {
          "open-composer": "./bin/open-composer",
          opencomposer: "./bin/open-composer",
          oc: "./bin/open-composer",
        },
        files: [
          "bin/open-composer",
          "bin/open-composer.cmd",
          "preinstall.mjs",
          "postinstall.mjs",
        ],
        scripts: {
          preinstall: "node ./preinstall.mjs",
          postinstall: "node ./postinstall.mjs",
        },
        version: String(CLI_VERSION),
        optionalDependencies: binaries,
      },
      null,
      2,
    ),
  );

  console.log("Prepared main package for publishing");

  // ---------------------------------------------------------------------------
  // Publish the binaries
  // ---------------------------------------------------------------------------

  console.log("Publishing binaries");

  for (const [name] of Object.entries(binaries)) {
    await $`cd dist/${name} && bun publish --access public --tag latest`;
  }

  console.log("Binaries published:", binaries);
}

export { binaries };
