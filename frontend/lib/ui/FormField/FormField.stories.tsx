import type { Story } from "@ladle/react";

import { FormField } from "./FormField";
import { ValidationResultCode } from "@kiesraad/api";

type Props = {
  error?: ValidationResultCode;
};

export const DefaultFormField: Story<Props> = ({ error }) => (
  <FormField error={error}>
    <input type="text" />
  </FormField>
);

export default {
  args: {
    label: "Invoer",
    text: "Invoer",
  },
  argTypes: {
    error: {
      options: [undefined, "OutOfRange", "IncorrectTotal", "AboveThreshold"],
      defaultValue: "OutOfRange",
      control: { type: "radio" },
    },
  },
};
