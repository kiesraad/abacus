import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  testDir: "./e2e-tests/app-tests",
  outputDir: "./test-results/app",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://localhost:4009",
  },
  webServer: [
    {
      // use different port, so it doesn't conflict with local dev server
      command: "npm run start:msw -- --port 4009",
      port: 4009,
    },
  ],
});

export default config;
