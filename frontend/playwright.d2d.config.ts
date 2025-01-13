import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

import commonConfig from "./playwright.common.config";

function returnWebserverCommand(): string {
  if (process.env.CI) {
    // CI: use existing backend build, reset and seed database
    const binary = process.platform === "win32" ? "..\\builds\\backend\\abacus.exe" : "../builds/backend/abacus";
    return `${binary} --reset-database --port 8081`;
  } else if (process.env.LOCAL_CI) {
    // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
    return `npm run build &&
      cd ../backend &&
      npx cross-env ASSET_DIR=$PWD/../frontend/dist cargo run --features memory-serve -- --database target/debug/playwright.sqlite --reset-database --port 8081`;
  } else {
    // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
    return `cd ../backend && npx cross-env ASSET_DIR=$PWD/../frontend/dist cargo run --features memory-serve -- --database ../backend/target/debug/playwright.sqlite --port 8081`;
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
