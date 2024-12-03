import type { Story, StoryDefault } from "@ladle/react";

import { ButtonVariant, Size } from "@kiesraad/ui";

import { Button } from "./Button";

type Props = {
  text: string;
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

export const Buttons: Story<Props> = ({ text, size, disabled }) => (
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

export default {
  args: {
    text: "Invoer",
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
} satisfies StoryDefault<Props>;
