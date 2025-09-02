import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import type { DataEntryStatusName } from "@/types/generated/openapi";

import { Badge, BadgeProps } from "./Badge";

const badgeTypes: DataEntryStatusName[] = [
  "first_entry_not_started",
  "first_entry_in_progress",
  "first_entry_has_errors",
  "second_entry_not_started",
  "second_entry_in_progress",
  "entries_different",
  "definitive",
];

export const AllBadges: StoryObj = {
  render: () => {
    return (
      <>
        {badgeTypes.map((type) => (
          <div id={type} key={type}>
            <Badge type={type} showIcon />
          </div>
        ))}
      </>
    );
  },

  play: async ({ canvas }) => {
    const notStartedBadge = canvas.getByTestId("first_entry_not_started");
    await expect(notStartedBadge).toBeVisible();
    await expect(notStartedBadge).toHaveTextContent("1e invoer");
    await expect(within(notStartedBadge).queryByRole("img")).toBeNull();

    const firstEntryInProgressBadge = canvas.getByTestId("first_entry_in_progress");
    await expect(firstEntryInProgressBadge).toBeVisible();
    await expect(firstEntryInProgressBadge).toHaveTextContent("1e invoer");
    await expect(within(firstEntryInProgressBadge).getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

    const secondEntryBadge = canvas.getByTestId("second_entry_not_started");
    await expect(secondEntryBadge).toBeVisible();
    await expect(secondEntryBadge).toHaveTextContent("2e invoer");
    await expect(within(secondEntryBadge).queryByRole("img")).toBeNull();

    const secondEntryInProgressBadge = canvas.getByTestId("second_entry_in_progress");
    await expect(secondEntryInProgressBadge).toBeVisible();
    await expect(secondEntryInProgressBadge).toHaveTextContent("2e invoer");
    await expect(within(secondEntryInProgressBadge).getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

    const entriesDifferentBadge = canvas.getByTestId("entries_different");
    await expect(entriesDifferentBadge).toBeVisible();
    await expect(entriesDifferentBadge).toHaveTextContent("2e invoer");
    await expect(within(entriesDifferentBadge).queryByRole("img")).toBeNull();

    const definitiveBadge = canvas.getByTestId("definitive");
    await expect(definitiveBadge).toBeVisible();
    await expect(definitiveBadge).toHaveTextContent("Definitief");
    await expect(within(definitiveBadge).queryByRole("img")).toBeNull();
  },
};

export const CustomizableBadge: StoryObj<BadgeProps> = {
  args: {
    type: "first_entry_not_started",
    showIcon: false,
  },
  argTypes: {
    type: {
      options: badgeTypes,
      control: { type: "radio" },
    },
    showIcon: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  render: ({ type, showIcon }) => <Badge type={type} showIcon={showIcon} />,
};

export default {};
