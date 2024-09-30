import { beforeAll, vi } from "vitest";

beforeAll(() => {
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
