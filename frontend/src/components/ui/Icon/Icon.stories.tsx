import type { Story } from "@ladle/react";

import { Size } from "@/components/ui";
import { IconCheckHeart } from "@/lib/icon";

import { Icon } from "./Icon";

type Props = {
  color: "primary" | "accept" | "warning" | "error";
  size: Size;
};

export const DefaultIcon: Story<Props> = ({ color, size }) => (
  <Icon size={size} color={color} icon={<IconCheckHeart />} />
);

export default {
  argTypes: {
    color: {
      options: ["primary", "accept", "warning", "error"],
      defaultValue: "accept",
      control: { type: "radio" },
    },
    size: {
      options: ["xs", "sm", "md", "lg", "xl"],
      defaultValue: "md",
      control: { type: "radio" },
    },
  },
};
