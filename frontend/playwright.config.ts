import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

function returnWebserverCommand(): string {
  // CI: use existing backend build
  if (process.env.CI) {
    const binary = process.platform === "win32" ? "..\\builds\\backend\\abacus.exe" : "../builds/backend/abacus";
    let argv = `${binary} --port 8081`;
    // Release builds don't have the dev-database feature
    if (!process.env.RELEASE_BUILD) {
      argv += " --reset-database";
    }
    return argv;
  }

  // LOCAL CI: build frontend, then build and run backend with database reset and seed playwright-specific database
  if (process.env.LOCAL_CI) {
    return `npm run build && cd ../backend && cargo run --features memory-serve,embed-typst -- --database target/debug/playwright.sqlite --reset-database --port 8081`;
  }

  // DEV: expects frontend build and playwright-specific database setup/seeding to have been done
  //return `cd ../backend && cargo run --release --features memory-serve,embed-typst -- --database ../backend/db.sqlite --port 8081`;
  return "cd ../backend";
}

const config: PlaywrightTestConfig = defineConfig({
  maxFailures: 0,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 3 : 0,
  // Use all available cores on GitHub Actions. Default is 50%, use that locally.
  workers: process.env.CI ? "200%" : "200%",
  fullyParallel: true,
  // ...commonConfig,
  // Increase the test timeout on CI, which is usually slower
  timeout: process.env.CI ? 300_000 : 300_000,
  expect: {
    timeout: 300_000,
  },
  reporter: process.env.CI
    ? [["list"], ["github"], ["junit", { outputFile: "playwright.e2e.junit.xml" }], ["html", { open: "never" }]]
    : "list",
  testDir: "./e2e-tests",
  outputDir: "./test-results/e2e-tests",
  testMatch: /\.e2e\.ts/,
  use: {
    trace: "retain-on-first-failure",
    testIdAttribute: "id",
    baseURL: process.env.DEBUG_DEVELOPMENT ? "http://localhost:3000" : "http://192.168.30.13:8081",
  },
  webServer: process.env.DEBUG_DEVELOPMENT ? [] : [],
  projects: [
    {
      name: "chrome1",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome2",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome3",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome4",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome5",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox1",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox2",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox3",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox4",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox5",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },/*
    {
      name: "safari1",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari2",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari3",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari4",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari5",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome6",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome7",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome8",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome9",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome10",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox6",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox7",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox8",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox9",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox10",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari6",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari7",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari8",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari9",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari10",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome16",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome17",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome18",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome19",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "chrome110",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        ...devices["Desktop Chrome"],
        channel: "chromium",
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox16",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox17",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox18",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox19",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "firefox110",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari16",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari17",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari18",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari19",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },
    {
      name: "safari110",
      testIgnore: /initialisation\.e2e\.ts/,
      use: {
        ...devices["Desktop Safari"],
        userAgent: "Abacus-User-Agent/1",
      },
      dependencies: [],
    },*/
  ],
});

export default config;
