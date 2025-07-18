import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconCross } from "@/components/generated/icons";
import { ButtonVariant, Size } from "@/types/ui";

import { IconButton } from "./IconButton";

type Props = {
  label: string;
  variant: ButtonVariant;
  size: Size;
  isRound: boolean;
};

export const DefaultIconButton: StoryObj<Props> = {
  render: ({ label, variant, size, isRound }) => (
    <IconButton
      role="button"
      title="Icon Button"
      icon={<IconCross />}
      aria-label={label}
      variant={variant}
      size={size}
      isRound={isRound}
    />
  ),
};

export const DisabledIconButton: StoryObj<Props> = {
  render: ({ label, variant, size, isRound }) => (
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
  ),
};

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
} satisfies Meta<Props>;
