import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

function returnWebserverCommand(): string {
  if (process.env.CI) {
    // CI: use frontend build and backend build, reset and seed database
    return `cd ../builds/backend &&
      ./api --reset-database --seed-data --frontend-dist ../frontend --port 8081`;
  } else if (process.env.LOCAL_CI) {
    // LOCAL CI: build frontend, build backend, reset and seed playwright-specific database
    return `npm run build &&
      cd ../backend &&
      cargo build &&
      target/debug/api --database target/debug/playwright.sqlite --reset-database --seed-data --frontend-dist ../frontend/dist --port 8081`;
  } else {
    // DEV: expects frontend build, backend build, playwright-specific database setup/seeding to have been done
    return `../backend/target/debug/api --database ../backend/target/debug/playwright.sqlite --frontend-dist ./dist --port 8081`;
  }
}

const config: PlaywrightTestConfig = defineConfig({
  ...commonConfig,
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
