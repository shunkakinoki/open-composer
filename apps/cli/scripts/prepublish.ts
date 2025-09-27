#!/usr/bin/env bun
/// <reference types="bun-types" />

import { $ } from "bun";
import { CLI_VERSION } from "../src/lib/version.js";

// -----------------------------------------------------------------------------
// Set the __dirname
// -----------------------------------------------------------------------------

const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);

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
const version = process.env.OPENCOMPOSER_VERSION ?? CLI_VERSION;
console.log(`Building CLI version ${version}`);

// -----------------------------------------------------------------------------
// Build for all target platforms using cross-compilation
// -----------------------------------------------------------------------------

for (const [os, arch] of targets) {
  const packageName = `opencomposer-${os}-${arch}`;
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
        version,
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
  // Create zip file for the package if `RELEASE_ZIP_FILES` is set
  // ---------------------------------------------------------------------------

  if (process.env.RELEASE_ZIP_FILES) {
    console.log(`Creating zip for ${packageName}`);

    const zipName = `${packageName}.zip`;
    console.log(`Creating zip: ${zipName}`);

    // Create zip file containing the entire package directory
    await $`cd dist && zip -r ${zipName} ${packageName}`;

    binaries[packageName] = version;
    console.log(`Built and zipped: ${packageName}`);
  }

  // ---------------------------------------------------------------------------
  // Create tar file for the package if `RELEASE_OPENCOMPOSER_BINS` is set
  // ---------------------------------------------------------------------------

  if (process.env.RELEASE_OPENCOMPOSER_BINS) {
    // -------------------------------------------------------------------------
    // Set the __dirname
    // -------------------------------------------------------------------------

    const dir = new URL("..", import.meta.url).pathname;
    process.chdir(dir);

    // -------------------------------------------------------------------------
    // Import the binaries
    // -------------------------------------------------------------------------

    const { binaries } = await import("./prepublish.js");

    // -------------------------------------------------------------------------
    // Copy the binary to the dist directory and copy the required scripts
    // -------------------------------------------------------------------------

    await $`mkdir -p ./dist/opencomposer`;
    await $`cp -r ./bin ./dist/opencomposer/bin`;
    await $`cp ./scripts/preinstall.mjs ./dist/opencomposer/preinstall.mjs`;
    await $`cp ./scripts/postinstall.mjs ./dist/opencomposer/postinstall.mjs`;
    await Bun.file(`./dist/opencomposer/package.json`).write(
      JSON.stringify(
        {
          name: "open-composer",
          bin: {
            "open-composer": "./bin/opencomposer",
            opencomposer: "./bin/opencomposer",
            oc: "./bin/opencomposer",
          },
          scripts: {
            preinstall: "node ./preinstall.mjs",
            postinstall: "node ./postinstall.mjs",
          },
          version: CLI_VERSION,
          optionalDependencies: binaries,
        },
        null,
        2,
      ),
    );

    // -------------------------------------------------------------------------
    // Publish the binaries
    // -------------------------------------------------------------------------

    for (const [name] of Object.entries(binaries)) {
      await $`cd dist/${name} && bun publish --access public --tag latest`;
    }

    // -------------------------------------------------------------------------
    // Publish the package
    // -------------------------------------------------------------------------

    await $`cd ./dist/opencomposer && bun publish --access public --tag latest`;
  }
}

console.log("Binaries built:", binaries);

export { binaries };
