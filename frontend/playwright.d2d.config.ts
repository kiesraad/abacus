import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: "./e2e-tests/dom-to-db-tests",
  outputDir: "./test-results/dom-to-db",
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
    baseURL: "http://localhost:8081",
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
      command:
        // TODO: change as part of #218 (run in pipeline) after #154 (simpler loading of fixtures)
        "cd ../backend && cargo run --bin api -- --frontend-dist ../frontend/dist --port 8081",
      port: 8081,
    },
  ],
});

export default config;
