import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn } from "storybook/test";

import { IconCross } from "@/components/generated/icons";
import type { ButtonVariant, Size } from "@/types/ui";

import { IconButton } from "./IconButton";

type Props = {
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
  size: Size;
  isRound: boolean;
};

const buttonVariants: ButtonVariant[] = ["primary", "primary-destructive", "secondary", "tertiary", "underlined"];

export const DefaultIconButton: StoryObj<Props> = {
  render: ({ label, size, isRound, onClick }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <IconButton
            key={variant}
            role="button"
            title="Icon Button"
            icon={<IconCross />}
            aria-label={label}
            variant={variant}
            size={size}
            isRound={isRound}
            onClick={onClick}
          />
        </div>
      ))}
    </>
  ),
  play: async ({ canvas, userEvent, args }) => {
    const buttons = canvas.getAllByRole("button", { name: args.label });

    for (const button of buttons) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      await userEvent.click(button);
      // fireEvent.click(button);
      await expect(args.onClick).toHaveBeenCalled();
    }
  },
};

export const DisabledIconButton: StoryObj<Props> = {
  render: ({ label, size, isRound, onClick }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <IconButton
            role="button"
            title="Icon Button"
            icon={<IconCross />}
            aria-label={label}
            variant={variant}
            size={size}
            isRound={isRound}
            onClick={onClick}
            isDisabled
          />
        </div>
      ))}
    </>
  ),
  play: async ({ canvas, args }) => {
    // Test disabled buttons
    const buttons = canvas.getAllByRole("button", { name: args.label });

    for (const button of buttons) {
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();

      // Force click on disabled button to test it does nothing
      await fireEvent.click(button);
      await expect(args.onClick).not.toHaveBeenCalled();
    }
  },
};

export default {
  args: {
    label: "Close",
    onClick: fn(),
  },
  argTypes: {
    size: {
      options: ["sm", "md", "lg"],
      control: { type: "radio" },
    },
    isRound: {
      options: [true, false],
      control: { type: "boolean" },
    },
  },
} satisfies Meta<Props>;
