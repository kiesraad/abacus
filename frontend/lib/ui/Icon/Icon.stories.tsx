import type { Story } from "@ladle/react";

import { IconWarning } from "@kiesraad/icon";

import { Size } from "../ui.types";
import { Icon } from "./Icon";

type Props = {
  color: "primary" | "warning";
  size: Size;
};

export const DefaultIcon: Story<Props> = ({ color, size }) => (
  <Icon size={size} color={color} icon={<IconWarning />} />
);

export default {
  args: {
    label: "Invoer",
    text: "Invoer",
  },
  argTypes: {
    color: {
      options: ["primary", "warning"],
      control: { type: "radio" },
    },
    size: {
      options: ["xs", "sm", "md", "lg", "xl"],
      control: { type: "radio" },
    },
  },
};
