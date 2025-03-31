import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

function returnWebserverCommand(): string {
  if (process.env.CI) {
    // CI: use existing backend build, reset and seed database
    const binary = process.platform === "win32" ? "..\\builds\\backend\\abacus.exe" : "../builds/backend/abacus";
    return `${binary} --reset-database --seed-data --port 8081`;
  } else if (process.env.LOCAL_CI) {
    // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
    return `npm run build &&
      cd ../backend &&
      cargo run --features memory-serve -- --database target/debug/playwright.sqlite --reset-database --seed-data --port 8081`;
  } else {
    // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
    return `cd ../backend && cargo run --features memory-serve -- --database ../backend/target/debug/playwright.sqlite --port 8081`;
  }
}

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 30_000 : 20_000,
  reporter: process.env.CI
    ? [["list"], ["github"], ["junit", { outputFile: "playwright.ladle.junit.xml" }], ["html", { open: "never" }]]
    : "list",
  testDir: "./e2e-tests",
  outputDir: "./test-results/e2e-tests",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://127.0.0.1:8081",
  },
  webServer: [
    {
      command: returnWebserverCommand(),
      url: "http://127.0.0.1:8081",
      stdout: process.env.LOCAL_CI ? "pipe" : "ignore",
    },
  ],
});

export default config;
