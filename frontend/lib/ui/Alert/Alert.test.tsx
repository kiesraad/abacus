import { describe, expect, test, vi } from "vitest";

import { fireEvent, render } from "app/test/unit";

import { ClosableAlert, DefaultAlert } from "./Alert.stories";

describe("UI component: Alert", () => {
  test("Alert has expected children", () => {
    const { getByText } = render(
      <DefaultAlert type="error" title="Alert title" text="Alert body" />,
    );

    expect(getByText("Alert title")).toBeInTheDocument();
    expect(getByText("Alert body")).toBeInTheDocument();
  });

  test("Alert calls closeable", () => {
    const onClose = vi.fn();

    const { getByTitle } = render(
      <ClosableAlert type="error" title="Alert title" text="Alert body" onClose={onClose} />,
    );

    fireEvent(
      getByTitle("Melding sluiten"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
