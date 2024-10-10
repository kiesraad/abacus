import { describe, expect, test } from "vitest";

import { getQueriesForElement, render, screen } from "app/test/unit";

import { Modal } from "./Modal";

const component = (onClose: () => void) => (
  <div>
    <div id="modal"></div>
    <Modal title="Modal Title" onClose={onClose} />
  </div>
);

describe("UI component: Modal", () => {
  test("Modal renders", () => {
    const { baseElement } = render(component(() => {}));
    const modal = getQueriesForElement(baseElement).getByRole("dialog");

    expect(modal).toBeInTheDocument();
  });

  test("Modal has expected children", () => {
    const { baseElement } = render(component(() => {}));
    const modal = getQueriesForElement(baseElement).getByRole("dialog");

    expect(modal).toHaveTextContent("Modal Title");
    expect(screen.getByTestId("modal-title")).toHaveFocus();
  });
});
