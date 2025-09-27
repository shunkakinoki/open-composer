#!/usr/bin/env bun
/// <reference types="bun-types" />

import { $ } from "bun";
import pkg from "../package.json" with { type: "json" };

// -----------------------------------------------------------------------------
// Set the __dirname
// -----------------------------------------------------------------------------

const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);

// -----------------------------------------------------------------------------
// Import the binaries
// -----------------------------------------------------------------------------

const { binaries } = await import("./prepublish.js");

// -----------------------------------------------------------------------------
// Copy the binary to the dist directory and copy the required scripts
// -----------------------------------------------------------------------------

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
      version: pkg.version,
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
);

// -----------------------------------------------------------------------------
// Publish the binaries
// -----------------------------------------------------------------------------

for (const [name] of Object.entries(binaries)) {
  await $`cd dist/${name} && bun publish --access public --tag latest`;
}

// -----------------------------------------------------------------------------
// Publish the package
// -----------------------------------------------------------------------------

await $`cd ./dist/opencomposer && bun publish --access public --tag latest`;
