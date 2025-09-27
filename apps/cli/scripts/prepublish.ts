#!/usr/bin/env bun
/// <reference types="bun-types" />

import { $ } from "bun";
import { CLI_VERSION } from "../src/lib/version.js";

// -----------------------------------------------------------------------------
// Set the flags
// -----------------------------------------------------------------------------

console.log(`CI: ${process.env.CI}`);
console.log(`PUBLISH_PACKAGES: ${process.env.PUBLISH_PACKAGES}`);
console.log(`GITHUB_SHA: ${process.env.GITHUB_SHA}`);
console.log(`CHANGESET_RELEASE: ${process.env.CHANGESET_RELEASE}`);

// Use snapshot tag for changeset releases (Version Packages PR merges)
const isRelease =
  process.env.CI === "true" &&
  process.env.PUBLISH_PACKAGES === "true" &&
  process.env.GITHUB_SHA !== undefined;
const isChangesetRelease =
  isRelease && process.env.CHANGESET_RELEASE === "true";
const isSnapshotRelease = isRelease && !isChangesetRelease;

console.log(`isRelease: ${isRelease}`);
console.log(`isChangesetRelease: ${isChangesetRelease}`);
console.log(`isSnapshotRelease: ${isSnapshotRelease}`);

// -----------------------------------------------------------------------------
// Set the metadata
// -----------------------------------------------------------------------------

const VERSION = isChangesetRelease
  ? CLI_VERSION
  : `${CLI_VERSION}-${process.env.GITHUB_SHA?.slice(0, 7)}`;
const TAG = isChangesetRelease ? "latest" : "snapshot";

console.log(`TAG: ${TAG}`);
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
const rawVersion = process.env.OPENCOMPOSER_VERSION ?? CLI_VERSION;
// Parse version to handle formats like "opencomposer@0.1.0" -> "0.1.0"
const version = rawVersion.includes("@")
  ? rawVersion.split("@")[1]
  : rawVersion;
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

  await $`bun build --compile --target=${bunTarget} ./src/index.ts --outfile dist/${packageName}/bin/opencomposer`;

  // Make executable on Unix systems
  if (os !== "win32") {
    await $`chmod +x dist/${packageName}/bin/opencomposer`;
  }

  await Bun.write(
    `dist/${packageName}/package.json`,
    JSON.stringify(
      {
        name: packageName,
        version: VERSION,
        main: "bin/opencomposer",
        os: [os === "win32" ? "win32" : os],
        cpu: [arch],
        bin: {
          opencomposer: "bin/opencomposer",
        },
      },
      null,
      2,
    ),
  );

  // ---------------------------------------------------------------------------
  // Add the package to the binaries object
  // ---------------------------------------------------------------------------

  binaries[packageName] = version;
}

console.log(`Binaries built: ${JSON.stringify(binaries)}`);

// -----------------------------------------------------------------------------
// Create zip file for the package if `RELEASE_OPENCOMPOSER_ZIPS` is set
// -----------------------------------------------------------------------------

if (process.env.RELEASE_OPENCOMPOSER_ZIPS) {
  for (const [packageName] of Object.entries(binaries)) {
    console.log(`Creating zip for ${packageName}`);

    const zipName = `opencomposer-${packageName.split("/")[1]}.zip`;
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
          "open-composer": "./bin/opencomposer",
          opencomposer: "./bin/opencomposer",
          oc: "./bin/opencomposer",
        },
        files: ["bin/**/*", "preinstall.mjs", "postinstall.mjs"],
        scripts: {
          preinstall: "node ./preinstall.mjs",
          postinstall: "node ./postinstall.mjs",
        },
        version: VERSION,
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
    await $`cd dist/${name} && bun publish --access public --tag ${TAG}`;
  }

  console.log("Binaries published:", binaries);

  // ---------------------------------------------------------------------------
  // Publish the main package
  // ---------------------------------------------------------------------------

  console.log("Publishing main package");

  await $`bun publish --access public --tag ${TAG}`;

  console.log("Main package published");

  // ---------------------------------------------------------------------------
  // Reset git directory if `isSnapshotRelease` is set
  // ---------------------------------------------------------------------------

  if (isSnapshotRelease) {
    console.log("Resetting git directory");

    // Go to the root directory
    process.chdir(new URL("..", import.meta.url).pathname);

    await $`git reset --hard`;

    console.log("Git directory reset");
  }
}

export { binaries };
