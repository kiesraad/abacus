import type { Story } from "@ladle/react";

import { IconButton } from "./IconButton";
import { IconCross } from "@kiesraad/icon";
import { Size, Variant } from "../ui.types";

type Props = {
  label: string;
  variant: Variant;
  size: Size;
  isRound: boolean;
};

export const DefaultIconButton: Story<Props> = ({ label, variant, size, isRound }) => (
  <IconButton
    icon={<IconCross />}
    aria-label={label}
    variant={variant}
    size={size}
    isRound={isRound}
  />
);

export default {
  args: {
    label: "Invoer",
  },
  argTypes: {
    variant: {
      options: ["default", "secondary", "ghost", "alert"],
      control: { type: "radio" },
    },
    size: {
      options: ["sm", "md", "lg"],
      control: { type: "radio" },
    },
    isRound: {
      control: { type: "boolean" },
    },
  },
};
