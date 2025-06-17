import type { Meta, StoryFn } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ButtonVariant, Size } from "@/types/ui";

import { Button, ButtonProps } from "./Button";

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
];

export const Buttons: StoryFn<Props> = ({ text, onClick, size, disabled }) => (
  <>
    {buttonVariants.map((variant) => (
      <div key={variant} className="mb-lg">
        <h2>{variant}</h2>
        <Button
          id={"button-variant-" + variant}
          size={size}
          variant={variant}
          disabled={disabled}
          onClick={(e) => {
            onClick();
            // for assertions: set a data-has-been-clicked attribute
            e.currentTarget.dataset.hasBeenClicked = "true";
          }}
        >
          {text}
        </Button>
      </div>
    ))}
    <aside>
      <i>Disabled and different sizes can be seen using the Controls below</i>
    </aside>
  </>
);

export const ButtonLinks: StoryFn<Props> = ({ text, onClick, size, disabled }) => (
  <>
    {buttonVariants.map((variant) => (
      <div key={variant} className="mb-lg">
        <h2>{variant}</h2>
        <Button.Link
          id={"button-variant-" + variant}
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
    <aside>
      <i>Disabled and different sizes can be seen using the Controls below</i>
    </aside>
  </>
);

export const ButtonLabel: StoryFn<Props> = ({ text, onClick, size, disabled }) => (
  <>
    {buttonVariants.map((variant) => (
      <div key={variant} className="mb-lg">
        <h2>{variant}</h2>
        <Button.Label
          id={"button-variant-" + variant}
          size={size}
          variant={variant}
          disabled={disabled}
          onClick={onClick}
        >
          {text}
        </Button.Label>
      </div>
    ))}
    <aside>
      <i>Disabled and different sizes can be seen using the Controls below</i>
    </aside>
  </>
);

export default {
  title: "UI/Button",
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
