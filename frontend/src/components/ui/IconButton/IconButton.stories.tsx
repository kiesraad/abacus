import type { Story } from "@ladle/react";

import { ButtonVariant, Size } from "@/types/ui";

import { IconCross } from "@kiesraad/icon";

import { IconButton } from "./IconButton";

type Props = {
  label: string;
  variant: ButtonVariant;
  size: Size;
  isRound: boolean;
};

export const DefaultIconButton: Story<Props> = ({ label, variant, size, isRound }) => (
  <IconButton
    role="button"
    title="Icon Button"
    icon={<IconCross />}
    aria-label={label}
    variant={variant}
    size={size}
    isRound={isRound}
  />
);

export const DisabledIconButton: Story<Props> = ({ label, variant, size, isRound }) => (
  <IconButton
    role="button"
    title="Icon Button"
    icon={<IconCross />}
    aria-label={label}
    variant={variant}
    size={size}
    isRound={isRound}
    isDisabled
  />
);

export default {
  args: {
    label: "Invoer",
  },
  argTypes: {
    variant: {
      options: ["primary", "primary-destructive", "secondary", "tertiary", "tertiary-destructive"],
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
