import { describe, expect, test } from "vitest";

import { render, screen, within } from "@/testing/test-utils";

import { DefaultProgressList } from "./ProgressList.stories";

describe("UI component ProgressList", () => {
  test("first test", () => {
    render(<DefaultProgressList active={0} />);

    const acceptItem = screen.getByTestId("accept-item");
    expect(acceptItem).toBeVisible();
    const acceptIcon = within(acceptItem).getByRole("img");
    expect(acceptIcon).toHaveAccessibleName("opgeslagen");

    const errorItem = screen.getByTestId("error-item");
    expect(errorItem).toBeVisible();
    const errorIcon = within(errorItem).getByRole("img");
    expect(errorIcon).toHaveAccessibleName("bevat een fout");

    const warningItem = screen.getByTestId("warning-item");
    expect(warningItem).toBeVisible();
    const warningIcon = within(warningItem).getByRole("img");
    expect(warningIcon).toHaveAccessibleName("bevat een waarschuwing");

    const unsavedItem = screen.getByTestId("unsaved-item");
    expect(unsavedItem).toBeVisible();
    const unsavedIcon = within(unsavedItem).getByRole("img");
    expect(unsavedIcon).toHaveAccessibleName("nog niet afgerond");

    const emptyItem = screen.getByTestId("empty-item");
    expect(emptyItem).toBeVisible();
    const emptyIcon = within(emptyItem).getByRole("img");
    expect(emptyIcon).toHaveAccessibleName("leeg");

    const activeItem = screen.getByTestId("scroll-item-1");
    expect(activeItem).toBeVisible();
    const activeIcon = within(activeItem).getByRole("img");
    expect(activeIcon).toHaveAccessibleName("je bent hier");

    const idleItem = screen.getByTestId("idle-item");
    expect(idleItem).toBeVisible();
    expect(within(idleItem).queryByRole("img")).not.toBeInTheDocument();
  });
});
