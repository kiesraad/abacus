# Frontend

This frontend directory contains the code for the Abacus frontend application,
i.e. the user interface that runs in the browser and communicates with the
backend API server located in the `../backend` directory. The frontend is a
React application built with vite written in TypeScript. In order to run the 
frontend, you will need to have a backend API server running. For instructions 
on running the backend see the [README of the backend](../backend/README.md).

## Development

### Prerequisites

- [Node](https://nodejs.org) v24
- [pnpm](https://pnpm.io/) v10+

### Quickstart

After having installed these prerequisites and having cloned the repository, you
can quickly get started by following the quickstart instructions from the
[README of the backend](../backend/README.md) and running the following commands
after that (make sure to keep the backend API server running in the background):

```shell
cd frontend
pnpm install
pnpm dev
```

Once started, you should be able to access the frontend application in your
browser at http://localhost:3000. To get started quickly, you can visit the
http://localhost:3000/dev page to quickly login to specific users and quickly 
jump to specific parts of the application. For more detailed instructions, make 
sure to read the rest of this README.

### Building

Install JavaScript dependencies:

```sh
pnpm install
```

Install Playwright dependencies:

```sh
pnpm playwright install --with-deps --no-shell
```

### Running

To run with the backend API server, first [start the API server](../backend/README.md#running) and use:

```sh
pnpm dev
```

This runs the client with a (client-side) mock API:

```sh
pnpm dev:msw
```

### Linting

```sh
pnpm lint
```

### Testing

Unit tests

```sh
pnpm test
```

Browser tests using Playwright:

```sh
# tests for frontend with backend and database
# tests use database at backend/target/debug/playwright.sqlite
# build frontend, build backend, setup fresh seeded database:
pnpm test:e2e
# run tests, expect builds and database to be available:
pnpm test:e2e-dev

# view reports and traces, e.g. the ones saved by our pipeline:
pnpm playwright show-report <path-to-unzipped-report-folder>
```

When manually debugging Playwright tests in developer mode, it is important to have Abacus in the correct state:

- Run the Abacus backend with a clean database (in the `../backend` folder):
  ```sh
  cargo run --features memory-serve -- --reset-database
  ```
- Run the Abacus frontend in developer mode (here in `../frontend`):
  ```sh
  pnpm dev
  ```
- Start Playwright in debug mode (also here in `../frontend`):
  ```
  npm run test:e2e-debug
  ```
- Alternatively, if you're using the Playwright VS Code extension, set `DEBUG_DEVELOPMENT=true` in `settings.json`:
  ```json
  "playwright.env": {
    "DEBUG_DEVELOPMENT": true
  },
  ```
  Also note that the VS Code extension only works properly if you open the `../frontend` folder as project root in VS Code (otherwise the relative paths used within the tests are incorrect).
- Run the "create test user accounts" test with the `initialisation-test` and `setup-test-users` projects enabled. The "create test user accounts" test depends on the initialisation tests, so those will also run automatically. These initialisation tests can only be run once on a clean database, if you try to run them again they will fail.
- Now the test user has been initialized, disable the `initialisation-test` and `setup-test-users` projects, and enable one or more of the browser projects (`chrome` or `firefox`). Now you can run any of the other browser tests!

### Component Development with Storybook

```sh
# Start Storybook development server
pnpm storybook

# Run Storybook tests
pnpm test --project storybook
```

Storybook runs on [http://localhost:6006](http://localhost:6006) and provides an interactive component library for developing and testing UI components in isolation.

## Production build

Prerequisites:

- [Node](https://nodejs.org) v24
- [pnpm](https://pnpm.io/) v10

Install npm dependencies, skipping development dependencies:

```sh
pnpm install --prod
```

Build the frontend:

```sh
pnpm build
```

The built frontend is located in the `dist` directory.

## Structure

### Dependencies

The application uses the following dependencies:

- `react`: creating efficient, declarative, and component-based web applications.
- `react-dom`: DOM implementation for rendering UI
- `react-router`: Handling browser routing for React applications
- `vite`: frontend build tool
- `lightningcss`: CSS post processor

#### Development dependencies

- `typescript`: Strongly typed layer on top of JavaScript
- `msw`: Mock Service Worker for mocking the server, client side
- `cross-env`: for building on Windows

#### Testing / linting dependencies

- `vitest`: Jest compatible unit test framework
- `jsdom`: a pure-JavaScript implementation of many web standards for use with Node.js
- `testing-library`: (React) component and dom test utilities
- `playwright`: e2e testing framework
- `biome`: formatter and linter
- `eslint`: Linter

### Scripts

#### gen_openapi

Generate TypeScript types from `/backend/openapi.json`:

```sh
pnpm gen:openapi
```

This results in `/frontend/src/types/generated/openapi.ts`.

#### gen_icons

Generate React components from icons located in `/frontend/src/assets/icons`:

```sh
pnpm gen:icons
```

This results in `/frontend/src/components/generated/icons.tsx`.

#### gen_po

Use this script to create `.po` files (one for every defined locale) that can de used in translation software.
This script generates `.po` translation files from the current JSON translations in `/frontend/src/i18n/locales/<locale>/*.json`:

```sh
pnpm gen:po
```

This results in `/frontend/translations/<locale>.po`. These can be imported into translation software.

#### gen_translation-json

Use this script to convert modified `.po` files back to our application JSON translation files.
This script generates JSON translation files from `.po` translation files in `/frontend/translations/<locale>.po`:

```sh
pnpm gen:translation-json
```

This results in `/frontend/src/i18n/locales/<locale>/*.json`. These contain the texts used by the application.
