import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 30_000 : 10_000,
  // Use the list reporter even on CI, to get immediate feedback
  reporter: process.env.CI ? [["list"], ["github"], ["junit", { outputFile: "playwright.ladle.junit.xml" }]] : "list",
  testDir: "./src/components/ui",
  outputDir: "./test-results/ladle",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://localhost:61001/ladle/",
  },
  webServer: [
    {
      command: "npm run ladle -- --port 61001",
      url: "http://localhost:61001/ladle/",
    },
  ],
});

export default config;
