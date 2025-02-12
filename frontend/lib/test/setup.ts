import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeAll, expect, vi } from "vitest";
import failOnConsole from "vitest-fail-on-console";

import { matchers } from "./matchers";
import { server } from "./server";

window.scrollTo = () => {};

configure({
  testIdAttribute: "id",
});

failOnConsole();

expect.extend(matchers);

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });

  // mock scrollIntoView, used in progresslist
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();

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
  server.resetHandlers();
  server.events.removeAllListeners();
});
