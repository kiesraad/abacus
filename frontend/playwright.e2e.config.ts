import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

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
  ...commonConfig,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 30_000 : 20_000,
  reporter: process.env.CI
    ? [["list"], ["github"], ["junit", { outputFile: "playwright.e2e.junit.xml" }], ["html", { open: "never" }]]
    : "list",
  testDir: "./e2e-tests",
  outputDir: "./test-results/e2e-tests",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
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
});

export default config;
