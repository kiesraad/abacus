import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import failOnConsole from "vitest-fail-on-console";

import { resetDatabase } from "@kiesraad/api-mocks";

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

  // Workaround for https://github.com/jsdom/jsdom/issues/3294
  HTMLDialogElement.prototype.show = vi.fn(function mock(this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.showModal = vi.fn(function mock(this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function mock(this: HTMLDialogElement) {
    this.open = false;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  server.resetHandlers();
  server.events.removeAllListeners();
  resetDatabase();
});
