import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

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
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeEnabled();
  },
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
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
};

export const IsLoadingIconButton: StoryObj<Props> = {
  render: ({ label, variant, size, isRound }) => (
    <IconButton
      role="button"
      title="Icon Button"
      icon={<IconCross />}
      aria-label={label}
      variant={variant}
      size={size}
      isRound={isRound}
      isLoading
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
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
