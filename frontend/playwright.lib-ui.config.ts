import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: "./lib/ui",
  testMatch: /\.e2e\.ts/,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // use all available cores (2) on GitHub actions. default is 50%, use that locally
  workers: process.env.CI ? "100%" : undefined,
  timeout: 10 * 1000, // 10 seconds, because tests are small for now
  fullyParallel: true,
  use: {
    trace: "retain-on-failure",
    baseURL: "http://localhost:4009",
    testIdAttribute: "id",
  },
  projects: [
    {
      name: "chrome",
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "safari",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: [
    {
      command: "npm run ladle",
      port: 61000,
    },
  ],
});

export default config;
