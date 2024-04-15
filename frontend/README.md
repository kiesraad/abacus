# Electoral Council election results management system - Frontend

## Development

### Prerequisites
- [Node](https://nodejs.org) v20


### Building

Install JavaScript dependencies

```sh
npm install
```

Install Playwright dependencies

```sh
npx playwright install --with-deps
```

### Running

This runs the client with a (clientside) mock API

```sh
npm run dev
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

e2e tests
```sh
npm run e2e

# with playwright web ui
npm run e2eui 
```

### UI Component development

Develop and test UI components in isolation.

```sh
npm run ladle
```
Open: http://localhost:61000/

## Structure

### Dependencies

The application uses the following dependencies:

- `react`: creating efficient, declarative, and component-based web applications.
- `react-dom`: DOM implementation for rendering UI
- `react-dom-router`: Handling browser routing for react applications

#### Development dependencies

- `typescript`: Strongly typed layer ontop of javascript
- `msw`: Mock Service Worker for mocking the server, client side
- `vite`: frontend build tool
- `ladle`: simple development and test environment for UI components

#### Testing / linting dependencies

- `vitest`: Jest compatible unit test framework
- `testing-library`: (react) Component and dom test utilities
- `playwright`: e2e testing framework
- `prettier`: Opinionated code formatter
- `eslint`: Linter

