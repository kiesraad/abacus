import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const commonConfig: PlaywrightTestConfig = defineConfig({
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Use all available cores on GitHub Actions. Default is 50%, use that locally.
  workers: process.env.CI ? "100%" : undefined,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 30_000 : 10_000,
  fullyParallel: true,
  use: {
    // Local runs don't have retries, so we have a trace of each failure. On CI we do have retries, so keeping the trace of the first failure allows us to investigate flaky tests.
    trace: "retain-on-first-failure",
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
        channel: "chromium",
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
});

export default commonConfig;
