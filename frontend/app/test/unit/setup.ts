import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import failOnConsole from "vitest-fail-on-console";

import { server } from "./server";

configure({
  testIdAttribute: "id",
});

failOnConsole();

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  server.restoreHandlers();
});
