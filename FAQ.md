# FAQ

## Why do tests fail when I run `bun test` instead of `bun run test`?

`bun run test` executes the test suite through Turbo, which spins up each package's workspace with the correct configuration, so modules like `cloudflare:workers` resolve and environment-specific caches stay isolated. Running `bun test` directly skips Turbo and executes every test file in a single global runtime. That global run misses the workspace-level preload configuration, so the PostHog worker cannot resolve the `cloudflare:workers` module, and services that assume isolated caches (such as config/cache) fail because they see the wrong runtime context.

To run tests successfully, either keep using `bun run test` or add a repository-level `bunfig.toml` (or similar test preloading setup) that mirrors the Turbo workspace isolation before invoking `bun test` directly.
