# Electoral Council election results management system - Frontend

## Development

### Prerequisites

- [Node](https://nodejs.org) v22

### Building

Install JavaScript dependencies:

```sh
npm install
```

Install Playwright dependencies:

```sh
npx playwright install --with-deps --no-shell
```

### Running

To run with the backend API server, first [start the API server](../backend/README.md#running) and use:

```sh
npm run dev
```

This runs the client with a (client-side) mock API:

```sh
npm run dev:mock
```

### Linting

```sh
npm run lint
```

### Testing

Unit tests

```sh
npm run test
```

Browser tests using Playwright:

```sh
# tests for frontend with backend and database
# tests use database at backend/target/debug/playwright.sqlite
# build frontend, build backend, setup fresh seeded database:
npm run test:e2e
# run tests, expect builds and database to be available:
npm run test:e2e-dev

# view reports and traces, e.g. the ones saved by our pipeline:
npx playwright show-report <path-to-unzipped-report-folder>
```

## Production build

Prerequisites:

- [Node](https://nodejs.org) v22

Install npm dependencies, skipping development dependencies:

```sh
npm clean-install --omit=dev
```

Build the frontend:

```sh
npm run build
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
- `lefthook`: git hook automation
- `cross-env`: for building on Windows

#### Testing / linting dependencies

- `vitest`: Jest compatible unit test framework
- `jsdom`: a pure-JavaScript implementation of many web standards for use with Node.js
- `testing-library`: (React) component and dom test utilities
- `playwright`: e2e testing framework
- `prettier`: Opinionated code formatter
- `eslint`: Linter

### Scripts

#### gen_openapi_types

Generate Typescript types from `/backend/openapi.json`:

```sh
npm run gen:openapi
```

This results in `/frontend/src/types/generated/openapi.ts`.

#### gen_icons

Generate React components from icons located in `/frontend/src/assets/icons`:

```sh
npm run gen:icons
```

This results in `/frontend/src/components/generated/icons.tsx`.

#### gen_po

Use this script to create `.po` files (one for every defined locale) that can de used in translation software.
This script generates `.po` translation files from the current json translations in `/frontend/src/i18n/locales/<locale>/*.json`:

```sh
npm run gen:po
```

This results in `/frontend/translations/<locale>.po`. These can be imported into translation software.

#### gen_translation-json

Use this script to convert modified `.po` files back to our application json translation files.
This script generates json translation files from `.po` translation files in `/frontend/translations/<locale>.po`:

```sh
npm run gen:translation-json
```

This results in `/frontend/src/i18n/locales/<locale>/*.json`. These contain the texts used by the application.
