import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

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
      command: process.env.CI
        ? // CI: use frontend build and backend build, reset and seed database
          "cd ../builds/backend && ./api --reset-database --seed-data --frontend-dist ../frontend --port 8081"
        : // local: build and run backend, expect frontend build and database setup/seeding to have been done
          "cd ../backend && cargo run -- --frontend-dist ../frontend/dist --port 8081",
      port: 8081,
    },
  ],
});

export default config;
