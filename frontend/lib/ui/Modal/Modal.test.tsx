import { describe, expect, test } from "vitest";

import { getQueriesForElement, render } from "app/test/unit";

import { Modal } from "./Modal";

const component = (onClose: () => void) => (
  <div>
    <div id="modal"></div>
    <Modal onClose={onClose}>
      <h2 id="modal-title">Modal</h2>
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
  });
});
