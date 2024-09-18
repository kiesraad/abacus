import type { Story } from "@ladle/react";

import { Badge, BadgeProps } from "./Badge";

export const AllBadges: Story = () => {
  return (
    <>
      <Badge type="definitive" />
      <Badge type="first_entry" />
    </>
  );
};

export const CustomizableBadge: Story<BadgeProps> = ({ type }) => <Badge type={type} />;

CustomizableBadge.argTypes = {
  type: {
    options: ["definitive", "first_entry"],
    defaultValue: "first_entry",
  },
};
