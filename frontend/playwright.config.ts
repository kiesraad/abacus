import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

function returnWebserverCommand(): string {
  // CI: use existing backend build, reset and seed database
  if (process.env.CI) {
    const binary = process.platform === "win32" ? "..\\builds\\backend\\abacus.exe" : "../builds/backend/abacus";
    return `${binary} --reset-database --port 8081`;
  }

  // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
  if (process.env.LOCAL_CI) {
    return `npm run build && cd ../backend && cargo run --features memory-serve,embed-typst -- --database target/debug/playwright.sqlite --reset-database --port 8081`;
  }

  // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
  return `cd ../backend && cargo run --features memory-serve,embed-typst -- --database ../backend/target/debug/playwright.sqlite --port 8081`;
}

const config: PlaywrightTestConfig = defineConfig({
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Use all available cores on GitHub Actions. Default is 50%, use that locally.
  workers: process.env.CI ? "100%" : undefined,
  fullyParallel: true,
  // ...commonConfig,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 30_000 : 20_000,
  reporter: process.env.CI
    ? [["list"], ["github"], ["junit", { outputFile: "playwright.e2e.junit.xml" }], ["html", { open: "never" }]]
    : "list",
  testDir: "./e2e-tests",
  outputDir: "./test-results/e2e-tests",
  testMatch: /\.e2e\.ts/,
  use: {
    trace: "retain-on-first-failure",
    testIdAttribute: "id",
    baseURL: process.env.DEBUG_DEVELOPMENT ? "http://localhost:3000" : "http://127.0.0.1:8081",
  },
  webServer: process.env.DEBUG_DEVELOPMENT
    ? []
    : [
        {
          command: returnWebserverCommand(),
          url: "http://127.0.0.1:8081",
          stdout: process.env.LOCAL_CI ? "pipe" : "ignore",
        },
      ],
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

export default config;
