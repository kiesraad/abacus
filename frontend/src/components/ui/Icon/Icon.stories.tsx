import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconCheckHeart } from "@/components/generated/icons";
import { Size } from "@/types/ui";

import { Icon } from "./Icon";

type Props = {
  color: "primary" | "accept" | "warning" | "error";
  size: Size;
};

export const DefaultIcon: StoryObj<Props> = {
  args: {
    color: "accept",
    size: "md",
  },
  render: ({ color, size }) => <Icon size={size} color={color} icon={<IconCheckHeart />} />,
};

export default {
  argTypes: {
    color: {
      options: ["primary", "accept", "warning", "error"],
      control: { type: "radio" },
    },
    size: {
      options: ["xs", "sm", "md", "lg", "xl"],
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
