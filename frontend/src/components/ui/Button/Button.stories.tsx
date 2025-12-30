import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn } from "storybook/test";

import type { ButtonVariant, Size } from "@/types/ui";

import { Button } from "./Button";

type Props = {
  text: string;
  onClick: () => void;
  size: Size;
  disabled: boolean;
};

const buttonVariants: ButtonVariant[] = [
  "primary",
  "primary-destructive",
  "secondary",
  "tertiary",
  "tertiary-destructive",
  "underlined",
];

export const Buttons: StoryObj<Props> = {
  render: ({ text, onClick, size }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <Button id={`button-variant-${variant}`} size={size} variant={variant} onClick={onClick}>
            {text}
          </Button>
        </div>
      ))}
    </>
  ),

  args: {
    disabled: false,
  },

  argTypes: {
    disabled: { control: false },
  },

  play: async ({ canvas, userEvent, args }) => {
    const buttons = canvas.getAllByRole("button", { name: args.text });

    for (const button of buttons) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      await userEvent.click(button);
      // fireEvent.click(button);
      await expect(args.onClick).toHaveBeenCalled();
    }
  },
};

export const ButtonsDisabled: StoryObj<Props> = {
  render: ({ text, onClick, size, disabled }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <Button id={`button-variant-${variant}`} size={size} variant={variant} disabled={disabled} onClick={onClick}>
            {text}
          </Button>
        </div>
      ))}
    </>
  ),

  args: {
    disabled: true,
  },

  argTypes: {
    disabled: { control: false },
  },

  play: async ({ canvas, args }) => {
    // Test disabled buttons
    const buttons = canvas.getAllByRole("button", { name: args.text });

    for (const button of buttons) {
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();

      // Force click on disabled button to test it does nothing
      await fireEvent.click(button);
      await expect(args.onClick).not.toHaveBeenCalled();
    }
  },
};

export const ButtonLinks: StoryObj<Props> = {
  render: ({ text, onClick, size, disabled }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <Button.Link
            id={`button-variant-${variant}`}
            size={size}
            variant={variant}
            disabled={disabled}
            to="#"
            onClick={onClick}
          >
            {text}
          </Button.Link>
        </div>
      ))}
    </>
  ),
};

export const ButtonLabel: StoryObj<Props> = {
  render: ({ text, onClick, size, disabled }) => (
    <>
      {buttonVariants.map((variant) => (
        <div key={variant} className="mb-lg">
          <h2>{variant}</h2>
          <Button.Label
            id={`button-variant-${variant}`}
            htmlFor={`input-variant-${variant}`}
            size={size}
            variant={variant}
            disabled={disabled}
            onClick={onClick}
          >
            {text}
          </Button.Label>
          <input id={`input-variant-${variant}`} type="file" name="file_input" style={{ display: "none" }} />
        </div>
      ))}
    </>
  ),
};

export default {
  args: {
    text: "Invoer",
    onClick: fn(),
  },
  argTypes: {
    size: {
      options: ["xs", "sm", "md", "lg", "xl"],
      control: { type: "radio" },
    },
    disabled: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<Props>;
