import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

function returnWebserverCommand(): string {
  if (process.env.CI) {
    // CI: use existing backend build, reset and seed database
    return `../builds/backend/api --reset-database --seed-data --port 8081`;
  } else if (process.env.LOCAL_CI) {
    // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
    return `npm run build &&
      cd ../backend &&
    ASSET_DIR=$PWD/../frontend/dist cargo run --features memory-serve -- --database target/debug/playwright.sqlite --reset-database --seed-data --port 8081`;
  } else {
    // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
    return `cd ../backend && ASSET_DIR=$PWD/../frontend/dist cargo run --features memory-serve -- --database ../backend/target/debug/playwright.sqlite --port 8081`;
  }
}

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
  workers: 1, // overrides commonConfig to disable parallel test execution
  reportSlowTests: { max: 5, threshold: 25000 }, // TODO: split test files so we can return to default of 15 seconds
  testDir: "./e2e-tests/dom-to-db-tests",
  outputDir: "./test-results/dom-to-db",
  testMatch: /\.e2e\.ts/,
  use: {
    ...commonConfig.use,
    baseURL: "http://localhost:8081",
  },
  webServer: [
    {
      command: returnWebserverCommand(),
      port: 8081,
    },
  ],
});

export default config;
