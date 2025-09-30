// Preload script for bun test
// Shows warning and exits before running tests

console.error(
  "\n⚠️  ERROR: Running 'bun test' directly is not supported in this repository.",
);
console.error(
  "   Use 'bun run test' instead to run tests with proper workspace isolation.",
);
console.error(
  "   The 'bun run test' command uses turbo to run tests in each workspace correctly.\n",
);

// Exit gracefully with success code
process.exit(0);
