import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import failOnConsole from "vitest-fail-on-console";

import { resetDatabase } from "../../../lib/api-mocks/Database.ts";
import { server } from "./server";

window.scrollTo = () => {};

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
  vi.clearAllMocks();
  server.resetHandlers();
  server.events.removeAllListeners();
  resetDatabase();
});
