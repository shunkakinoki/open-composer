#!/usr/bin/env bun
/// <reference types="bun-types" />

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the version from package.json
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

// Generate the version file
const versionFileContent = `// This file is auto-generated during build - do not edit manually
export const CLI_VERSION = "${version}";
`;

// Write the version file
const outputPath = join(__dirname, "../src/lib/version.generated.ts");
writeFileSync(outputPath, versionFileContent, "utf8");

console.log(`Generated version.generated.ts with version: ${version}`);
