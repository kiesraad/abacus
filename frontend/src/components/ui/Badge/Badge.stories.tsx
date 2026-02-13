import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { Badge, type BadgeProps, type BadgeType } from "./Badge";

const expectedBadgeLabel: Record<BadgeType, string> = {
  empty: "1e invoer",
  first_entry_in_progress: "1e invoer",
  first_entry_has_errors: "1e invoer",
  first_entry_finalised: "1e invoer",
  first_entry_finalised_for_typist: "2e invoer",
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
          <div key={type} className="mb-lg">
            <h2>{type}</h2>
            <Badge id={type} type={type} showIcon userRole={"coordinator"} />
          </div>
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

    const badgesWithIcons = badgeTypes.filter((badgeType) => {
      const badge = canvas.getByTestId(badgeType);
      return within(badge).queryByRole("img", { hidden: true }) !== null;
    });

    await expect(badgesWithIcons).toEqual(["first_entry_in_progress", "second_entry_in_progress"]);
  },
};

export const CustomizableBadge: StoryObj<BadgeProps> = {
  args: {
    type: "empty",
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
  render: ({ type, showIcon }) => <Badge type={type} showIcon={showIcon} userRole={"coordinator"} />,
};

export default {};
