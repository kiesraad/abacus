import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { Badge, type BadgeProps, type BadgeType } from "./Badge";

const expectedBadgeLabel: Record<BadgeType, string> = {
  first_entry_not_started: "1e invoer",
  first_entry_in_progress: "1e invoer",
  first_entry_has_errors: "1e invoer",
  first_entry_finalised: "1e invoer",
  second_entry_not_started: "2e invoer",
  second_entry_in_progress: "2e invoer",
  entries_different: "2e invoer",
  definitive: "Definitief",
};

const badgeTypes = Object.keys(expectedBadgeLabel) as BadgeType[];

export const Badges: StoryObj = {
  render: () => {
    return (
      <>
        {badgeTypes.map((type) => (
          <Badge id={type} key={type} type={type} />
        ))}
      </>
    );
  },

  play: async ({ canvas }) => {
    for (const badgeType of badgeTypes) {
      const badge = canvas.getByTestId(badgeType);
      await expect(badge).toHaveTextContent(expectedBadgeLabel[badgeType]);
      await expect(within(badge).queryByRole("img")).toBeNull();
      await expect(badge.className, "there should be a css class defined for this type").toContain(badgeType);
    }
  },
};

export const BadgesWithIcons: StoryObj = {
  render: () => {
    return (
      <>
        {badgeTypes.map((type) => (
          <Badge id={type} key={type} type={type} showIcon />
        ))}
      </>
    );
  },

  play: async ({ canvas }) => {
    const badgesWithIcons = badgeTypes.filter((badgeType) => {
      const badge = canvas.getByTestId(badgeType);
      return within(badge).queryByRole("img") !== null;
    });

    await expect(badgesWithIcons).toEqual(["first_entry_in_progress", "second_entry_in_progress"]);
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
