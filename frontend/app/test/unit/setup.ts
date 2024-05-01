import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

configure({
  testIdAttribute: "id",
});

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  cleanup();
});
afterAll(() => {
  server.restoreHandlers();
});
