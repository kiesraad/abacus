import type { Story } from "@ladle/react";

import { Badge, BadgeProps } from "./Badge";

export const AllBadges: Story = () => {
  return (
    <>
      <Badge type="definitive" />
      <Badge type="first_entry" />
      <Badge type="first_entry_in_progress" showIcon />
    </>
  );
};

export const CustomizableBadge: Story<BadgeProps> = ({ type, showIcon }) => <Badge type={type} showIcon={showIcon} />;

CustomizableBadge.argTypes = {
  type: {
    options: ["definitive", "first_entry", "first_entry_in_progress"],
    defaultValue: "first_entry",
    control: { type: "radio" },
  },
  showIcon: {
    options: [true, false],
    defaultValue: false,
    control: { type: "radio" },
  },
};
