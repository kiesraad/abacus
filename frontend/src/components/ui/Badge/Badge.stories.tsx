import type { Story } from "@ladle/react";

import type { DataEntryStatusName } from "@/api/gen/openapi";

import { Badge, BadgeProps } from "./Badge";

const badgeTypes: DataEntryStatusName[] = [
  "first_entry_not_started",
  "first_entry_in_progress",
  "second_entry_not_started",
  "second_entry_in_progress",
  "entries_different",
  "definitive",
];

export const AllBadges: Story = () => {
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

export const CustomizableBadge: Story<BadgeProps> = ({ type, showIcon }) => <Badge type={type} showIcon={showIcon} />;

CustomizableBadge.argTypes = {
  type: {
    options: badgeTypes,
    defaultValue: "first_entry_not_started",
    control: { type: "radio" },
  },
  showIcon: {
    options: [true, false],
    defaultValue: false,
    control: { type: "radio" },
  },
};
