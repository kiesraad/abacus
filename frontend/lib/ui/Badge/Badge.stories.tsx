import type { Story } from "@ladle/react";

import type { PollingStationStatus } from "@kiesraad/api";

import { Badge, BadgeProps } from "./Badge";

const badgeTypes: PollingStationStatus[] = [
  "not_started",
  "first_entry_in_progress",
  "first_entry_unfinished",
  "second_entry",
  "second_entry_in_progress",
  "second_entry_unfinished",
  "first_second_entry_different",
  "definitive",
];

export const AllBadges: Story = () => {
  return (
    <>
      {badgeTypes.map((type) => (
        <Badge key={type} type={type} showIcon />
      ))}
    </>
  );
};

export const CustomizableBadge: Story<BadgeProps> = ({ type, showIcon }) => <Badge type={type} showIcon={showIcon} />;

CustomizableBadge.argTypes = {
  type: {
    options: badgeTypes,
    defaultValue: "not_started",
    control: { type: "radio" },
  },
  showIcon: {
    options: [true, false],
    defaultValue: false,
    control: { type: "radio" },
  },
};
