#!/usr/bin/env bun
/// <reference types="bun-types" />

import { $ } from "bun";

const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);

const targets = [
  ["win32", "x64"],
  ["linux", "arm64"],
  ["linux", "x64"],
  ["linux", "x64-baseline"],
  ["darwin", "x64"],
  ["darwin", "x64-baseline"],
  ["darwin", "arm64"],
];

const binaries: Record<string, string> = {};
const version = process.env.OPENCOMPOSER_VERSION ?? "dev";

console.log(`Building CLI version ${version}`);

// Build for current platform first
const currentPlatform = process.platform;
const currentArch = process.arch;

console.log(`Building for current platform: ${currentPlatform}-${currentArch}`);
const name = `opencomposer-${currentPlatform}-${currentArch}`;

await $`mkdir -p dist/${name}/bin`;

try {
  // Use bun build to create executable
  await $`bun build --compile ./src/index.ts --outfile dist/${name}/bin/opencomposer`;

  // Make executable on Unix systems
  if (currentPlatform !== "win32") {
    await $`chmod +x dist/${name}/bin/opencomposer`;
  }

  await Bun.write(
    `dist/${name}/package.json`,
    JSON.stringify(
      {
        version,
        main: "bin/opencomposer",
        os: [currentPlatform === "win32" ? "win32" : currentPlatform],
        cpu: [currentArch],
        bin: {
          opencomposer: "bin/opencomposer",
        },
      },
      null,
      2,
    ),
  );

  binaries[name] = version;
  console.log(`Built: ${name}`);
} catch (error) {
  console.error(
    `Failed to build for ${currentPlatform}-${currentArch}:`,
    error,
  );

  // Create a simple shell script as fallback
  await Bun.write(
    `dist/${name}/bin/opencomposer`,
    `#!/bin/bash
echo "This is a placeholder executable for ${name}"
echo "To build native executables, run: bun build --compile ./src/index.ts --outfile dist/${name}/bin/opencomposer"
`,
  );

  if (currentPlatform !== "win32") {
    await $`chmod +x dist/${name}/bin/opencomposer`;
  }
}

// For other platforms, create placeholder packages for now
// In a real scenario, you might use cross-compilation tools or CI/CD
for (const [os, arch] of targets) {
  // Skip current platform as it was already built above
  if (os === currentPlatform && arch === currentArch) {
    continue;
  }

  const name = `opencomposer-${os}-${arch}`;
  console.log(`Creating placeholder package for ${name}`);

  await $`mkdir -p dist/${name}`;

  await Bun.write(
    `dist/${name}/package.json`,
    JSON.stringify(
      {
        name,
        version,
        description:
          "Placeholder package - cross-compilation not yet implemented",
        os: [os === "win32" ? "win32" : os],
        cpu: [arch],
        main: "index.js",
        scripts: {
          build: "echo 'Cross-compilation not implemented yet'",
        },
      },
      null,
      2,
    ),
  );

  binaries[name] = `${version}-placeholder`;
}

console.log("Binaries built:", binaries)

export { binaries };
