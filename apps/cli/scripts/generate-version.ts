#!/usr/bin/env bun
/// <reference types="bun-types" />

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read the version from package.json
const packageJsonPath = join(import.meta.dir, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

// Generate the version file
const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${version}";
`;

// Write the version file
const outputPath = join(import.meta.dir, "../src/lib/version.generated.ts");
await Bun.write(outputPath, versionFileContent);

console.log(`Generated version.generated.ts with version: ${version}`);
