import type { Story } from "@ladle/react";

import { Badge, BadgeProps } from "./Badge";

export const AllBadges: Story = () => {
  return (
    <>
      <Badge type="correction" />
      <Badge type="definitive" />
      <Badge type="difference" />
      <Badge type="extra_entry" />
      <Badge type="first_entry" />
      <Badge type="objections" />
      <Badge type="second_entry" />
    </>
  );
};

export const CustomizableBadge: Story<BadgeProps> = ({ type }) => <Badge type={type} />;

CustomizableBadge.argTypes = {
  type: {
    options: [
      "correction",
      "definitive",
      "difference",
      "extra_entry",
      "first_entry",
      "objections",
      "second_entry",
    ],
    defaultValue: "first_entry",
  },
};
