import type { Story } from "@ladle/react";

import { FormField } from "./FormField";
import { ResultCode } from "@kiesraad/api";

type Props = {
  error?: ResultCode;
};

export const DefaultFormField: Story<Props> = ({ error }) => (
  <FormField error={error ? [error] : undefined}>
    <input id="test-input" type="text" />
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
