import { describe, expect, test } from "vitest";

import { render, screen, within } from "@/testing/test-utils";

import cls from "./ProgressList.module.css";
import { DefaultProgressList, OverviewProgressList } from "./ProgressList.stories";

describe("UI component ProgressList", () => {
  test("first test", () => {
    render(<DefaultProgressList active={0} />);

    const acceptItem = screen.getByTestId("accept-item");
    expect(acceptItem).toBeVisible();
    expect(acceptItem).toHaveAttribute("aria-current", "false");
    const acceptIcon = within(acceptItem).getByRole("img");
    expect(acceptIcon).toHaveAccessibleName("opgeslagen");

    const activeAndAcceptItem = screen.getByTestId("active-accept-item");
    expect(activeAndAcceptItem).toBeVisible();
    expect(activeAndAcceptItem).toHaveAttribute("aria-current", "step");
    const activeAndAcceptIcon = within(activeAndAcceptItem).getByRole("img");
    expect(activeAndAcceptIcon).toHaveAccessibleName("je bent hier");

    const errorItem = screen.getByTestId("error-item");
    expect(errorItem).toBeVisible();
    expect(errorItem).toHaveAttribute("aria-current", "false");
    const errorIcon = within(errorItem).getByRole("img");
    expect(errorIcon).toHaveAccessibleName("bevat een fout");

    const warningItem = screen.getByTestId("warning-item");
    expect(warningItem).toBeVisible();
    expect(warningItem).toHaveAttribute("aria-current", "false");
    const warningIcon = within(warningItem).getByRole("img");
    expect(warningIcon).toHaveAccessibleName("bevat een waarschuwing");

    const unsavedItem = screen.getByTestId("unsaved-item");
    expect(unsavedItem).toBeVisible();
    expect(unsavedItem).toHaveAttribute("aria-current", "false");
    const unsavedIcon = within(unsavedItem).getByRole("img");
    expect(unsavedIcon).toHaveAccessibleName("nog niet afgerond");

    const emptyItem = screen.getByTestId("empty-item");
    expect(emptyItem).toBeVisible();
    expect(emptyItem).toHaveAttribute("aria-current", "false");
    const emptyIcon = within(emptyItem).getByRole("img");
    expect(emptyIcon).toHaveAccessibleName("leeg");

    const idleItem = screen.getByTestId("idle-item");
    expect(idleItem).toBeVisible();
    expect(idleItem).toHaveAttribute("aria-current", "false");
    expect(within(idleItem).queryByRole("img")).not.toBeInTheDocument();

    const activeItem = screen.getByTestId("scroll-item-1");
    expect(activeItem).toBeVisible();
    expect(activeItem).toHaveAttribute("aria-current", "step");
    const activeIcon = within(activeItem).getByRole("img");
    expect(activeIcon).toHaveAccessibleName("je bent hier");

    const idleDisabledItem = screen.getByTestId("idle-disabled-item");
    expect(idleDisabledItem).toBeVisible();
    expect(idleDisabledItem).toHaveAttribute("aria-current", "false");
    expect(within(idleDisabledItem).queryByRole("img")).not.toBeInTheDocument();
  });

  test("render overview items", async () => {
    render(<OverviewProgressList />);

    const listItems = await screen.findAllByRole("listitem");
    expect(listItems.map((item) => item.textContent)).toEqual([
      "Is er herteld?",
      "Aantal kiezers en stemmen",
      "Verschillen",
      "Lijst 1 - Vurige Vleugels Partij",
      "Lijst 2 - Wijzen van Water en Wind",
    ]);
    expect(listItems[0]).toHaveClass("idle");
    expect(listItems[1]).toHaveClass("warning");
    expect(listItems[3]).toHaveClass(cls.addSpace!);
  });
});
