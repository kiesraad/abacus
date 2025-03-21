import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  // Use the list reporter even on CI, to get immediate feedback
  reporter: process.env.CI ? [["list"], ["github"], ["junit", { outputFile: "playwright.ladle.junit.xml" }]] : "list",
  testDir: "./src/components/ui",
  outputDir: "./test-results/ladle",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://localhost:61000/ladle/",
  },
  webServer: [
    {
      command: "npm run ladle",
      url: "http://localhost:61000/ladle/",
    },
  ],
});

export default config;
