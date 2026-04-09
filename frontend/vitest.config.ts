import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { coverageConfigDefaults, defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        projects: [
          {
            extends: true,
            test: {
              name: "main",
              environment: "jsdom",
              restoreMocks: true,
              setupFiles: ["src/testing/setup.ts"],
              includeSource: ["src/**/*.ts"],
              testTimeout: 30_000,
            },
          },
          {
            extends: true,
            plugins: [
              storybookTest({
                configDir: path.join(dirname, ".storybook"),
                storybookScript: "pnpm storybook --ci",
              }),
            ],
            test: {
              name: "storybook",
              browser: {
                enabled: true,
                provider: playwright({
                  launchOptions: {
                    channel: process.env.CHROMIUM_CHANNEL ?? "chromium",
                    executablePath: process.env.CHROMIUM_BIN,
                  },
                }),
                headless: true,
                instances: [{ browser: "chromium" }],
              },
            },
          },
        ],
        coverage: {
          provider: "v8",
          exclude: [
            "*.config.ts",
            "*.config.mjs",
            "mockServiceWorker.js",
            "e2e-tests/**",
            "**/*.e2e.ts",
            "**/*.json",
            ...coverageConfigDefaults.exclude,
          ],
        },
      },
    }),
  ),
);
