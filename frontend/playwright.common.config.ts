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
  fullyParallel: true,
  use: {
    // Local runs don't have retries, so we have a trace of each failure. On CI we do have retries, so keeping the trace of the first failure allows us to investigate flaky tests.
    trace: "retain-on-first-failure",
    testIdAttribute: "id",
  },
  projects: [
    {
      name: "initialise",
      workers: 1,
      testMatch: /initialise\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "test-users",
      workers: 1,
      testMatch: /test-users\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
      dependencies: ["initialise"],
    },
    {
      name: "chrome",
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
      },
      dependencies: ["test-users"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["test-users"],
    },
    {
      name: "safari",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["test-users"],
    },
  ],
});

export default commonConfig;
