import type { Story } from "@ladle/react";

import { Button } from "./Button";
import { Size, Variant } from "../ui.types";

type Props = {
  label: string;
  text: string;
  variant: Variant;
  size: Size;
};

export const DefaultButton: Story<Props> = ({ label, text, variant, size }) => (
  <Button size={size} variant={variant} aria-label={label}>
    {text}
  </Button>
);

export const EnabledButton: Story<{
  text: string;
  label: string;
}> = ({ label, text }) => (
  <Button type="button" aria-label={label}>
    {text}
  </Button>
);

EnabledButton.args = {
  text: "Click me!",
  label: "enabled-button",
};

export const DisabledButton: Story<{
  text: string;
  label: string;
  disabled: boolean;
}> = ({ label, disabled, text }) => (
  <Button type="button" aria-label={label} disabled={disabled}>
    {text}
  </Button>
);

DisabledButton.args = {
  text: "I'm disabled!",
  label: "disabled-button",
  disabled: true,
};

export default {
  args: {
    label: "Invoer",
    text: "Invoer",
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
  },
};
