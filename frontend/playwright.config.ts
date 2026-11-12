import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

// With E2E_TLS set, run against an Abacus build with the `tls` feature
const tls = !!process.env.E2E_TLS;
const serverUrl = tls ? "https://127.0.0.1:8081" : "http://127.0.0.1:8081";
const features = tls ? "memory-serve,embed-typst,tls" : "memory-serve,embed-typst";

// Use port 8082 for the plaintext HTTP server when TLS is enabled
const tlsArgs = tls ? " --http-port 8082" : "";

function returnWebserverCommand(): string {
  // CI: use existing backend build
  if (process.env.CI) {
    const binary = process.platform === "win32" ? "..\\builds\\backend\\abacus.exe" : "../builds/backend/abacus";
    let argv = `${binary} --port 8081${tlsArgs}`;
    // Release builds don't have the dev-database feature
    if (!process.env.RELEASE_BUILD) {
      argv += " --reset-database";
    }
    return argv;
  }

  // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
  if (process.env.LOCAL_CI) {
    return `pnpm build && cd ../backend && cargo run --features ${features} -- --database target/debug/playwright.sqlite --reset-database --port 8081${tlsArgs}`;
  }

  // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
  return `cd ../backend && cargo run --features ${features} -- --database ../backend/target/debug/playwright.sqlite --port 8081${tlsArgs}`;
}

function chromiumUseOptions() {
  const channel = process.env.CHROMIUM_CHANNEL ?? "chromium";
  const executablePath = process.env.CHROMIUM_BIN;
  return {
    ...devices["Desktop Chrome"],
    userAgent: "Abacus-User-Agent/1",
    channel: channel,
    launchOptions: { executablePath: executablePath },
  };
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
    baseURL: process.env.DEBUG_DEVELOPMENT ? "http://localhost:3000" : serverUrl,
    // The browsers and API request contexts do not trust the local CA
    ignoreHTTPSErrors: tls,
  },
  webServer: process.env.DEBUG_DEVELOPMENT
    ? []
    : [
        {
          command: returnWebserverCommand(),
          url: serverUrl,
          ignoreHTTPSErrors: tls,
          stdout: process.env.LOCAL_CI ? "pipe" : "ignore",
          timeout: 300_000,
        },
      ],
  projects: [
    {
      name: "initialisation-test",
      workers: 1,
      testMatch: /initialisation\.e2e\.ts/,
      use: chromiumUseOptions(),
    },
    {
      name: "setup-test-users",
      workers: 1,
      testMatch: /setup-test-users\.ts/,
      use: chromiumUseOptions(),
      dependencies: ["initialisation-test"],
    },
    {
      name: "chrome",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...chromiumUseOptions(),
      },
      dependencies: ["setup-test-users"],
    },
    {
      name: "firefox",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: ["setup-test-users"],
    },
  ],
});

export default config;
