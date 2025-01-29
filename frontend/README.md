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

This runs the client with a (client-side) mock API:

```sh
npm run dev
```

To run with the backend API server, first [start the API server](../backend/README.md#running) and use:

```sh
npm run dev:server
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
# tests for ui components using ladle:
npm run test:ladle

# tests for frontend with backend and database
# tests use database at backend/target/debug/playwright.sqlite
# build frontend, build backend, setup fresh seeded database:
npm run test:e2e
# run tests, expect builds and database to be available:
npm run test:e2e-dev
```

### UI Component development

Develop and test UI components in isolation:

```sh
npm run ladle
```

And open Ladle at http://localhost:61000/.

## Production build

Prerequisites:

- [Node](https://nodejs.org) v22

Install npm dependencies, skippping development dependencies:

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
- `postcss` and `autoprefixer`: CSS post processors

#### Development dependencies

- `msw`: Mock Service Worker for mocking the server, client side
- `ladle`: simple development and test environment for UI components
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

This results in `/frontend/lib/api/gen/openapi.ts`.

#### gen_icons

Generate React components from icons located in `/frontend/lib/ui/svg`:

```sh
npm run gen:icons
```

This results in `/frontend/lib/icon/gen.tsx`.

#### gen_po

Use this script to create `.po` files (one for every defined locale) that can de used in translation software.
This script generates `.po` translation files from the current json translations in `/frontend/lib/i18n/loclales/<locale>/*.json`:

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

This results in `/frontend/lib/i18n/loclales/<locale>/*.json`. These contain the texts used by the application.
