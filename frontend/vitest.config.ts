import { coverageConfigDefaults, defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        environment: "jsdom",
        restoreMocks: true,
        setupFiles: ["src/testing/setup.ts"],
        includeSource: ["src/**/*.ts", "lib/**/*.ts"],
        testTimeout: 30_000,
        coverage: {
          provider: "v8",
          exclude: [
            "*.config.ts",
            "*.config.mjs",
            "mockServiceWorker.js",
            "e2e-tests/**",
            "**/*.stories.tsx",
            "**/*.e2e.ts",
            ...coverageConfigDefaults.exclude,
          ],
        },
      },
    }),
  ),
);
