import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  // Use the list reporter even on CI, to get immediate feedback
  reporter: process.env.CI ? [["list"], ["github"], ["junit", { outputFile: "playwright.ladle.junit.xml" }]] : "list",
  testDir: "./lib/ui",
  outputDir: "./test-results/ladle",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://localhost:61000",
  },
  webServer: [
    {
      command: "npm run ladle",
      port: 61000,
    },
  ],
});

export default config;
