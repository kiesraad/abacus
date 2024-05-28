import { fireEvent, render } from "app/test/unit";
import { describe, expect, test, vi } from "vitest";

import { DefaultAlert, ClosableAlert } from "./Alert.stories";

describe("UI component: Alert", () => {
  test("Alert renders", () => {
    render(<DefaultAlert type="error" title="Alert" text="Alert body" />);

    expect(true).toBe(true);
  });

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
      getByTitle("close"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
