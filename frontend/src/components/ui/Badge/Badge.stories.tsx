import type { StoryFn, StoryObj } from "@storybook/react-vite";

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

export const AllBadges: StoryFn = () => {
  return (
    <>
      {badgeTypes.map((type) => (
        <div id={type} key={type}>
          <Badge type={type} showIcon />
        </div>
      ))}
    </>
  );
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

export default {
  title: "UI/Badge",
};
