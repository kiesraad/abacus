import { devices, type PlaywrightTestConfig, defineConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: "./",
  testMatch: /\.e2e\.ts/,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // use all available cores (2) on github actions. default is 50%, use that locally
  workers: process.env.CI ? "100%" : undefined,
  timeout: 2 * 60 * 1000, // 2 minutes, surely overkill
  fullyParallel: true,
  use: {
    trace: "retain-on-failure",
    baseURL: "http://localhost:4009"
  },
  projects: [
    {
      name: "chrome",
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"]
        },
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "safari",
      use: { ...devices["Desktop Safari"] }
    }
  ],
  // use different port so it doesn't conflict with local dev server
  webServer: [
    {
      command: "npm run start:msw -- --port 4009",
      port: 4009
    },
    {
      command: "npm run ladle",
      port: 61000
    }
  ]
});

export default config;
