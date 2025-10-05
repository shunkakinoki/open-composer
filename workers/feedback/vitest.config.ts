import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    poolOptions: {
      workers: {
        isolatedStorage: true,
        miniflare: {
          compatibilityFlags: ["export_commonjs_default"],
        },
      },
    },
  },
});
