import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  cleanup();
});
afterAll(() => {
  server.restoreHandlers();
});
