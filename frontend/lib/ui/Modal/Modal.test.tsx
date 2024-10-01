import { describe, expect, test } from "vitest";

import { getQueriesForElement, render, screen } from "app/test/unit";

import { Modal } from "./Modal";

const component = (onClose: () => void) => (
  <div>
    <div id="modal"></div>
    <Modal id="modal-title" onClose={onClose}>
      <h2 id="modal-title" tabIndex={-1}>
        Modal
      </h2>
    </Modal>
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

    expect(modal).toHaveTextContent("Modal");
    expect(screen.getByTestId("modal-title")).toHaveFocus();
  });
});
