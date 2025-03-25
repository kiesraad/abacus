import type { Story } from "@ladle/react";

import { FormField } from "./FormField";

type Props = {
  hasError: boolean;
  hasWarning: boolean;
};

export const DefaultFormField: Story<Props> = ({ hasError, hasWarning }) => (
  <FormField id="test-form-field" hasError={hasError} hasWarning={hasWarning}>
    <input id="test-input" type="text" aria-invalid={hasError || hasWarning ? "true" : "false"} />
  </FormField>
);

export default {
  args: {
    label: "Invoer",
    text: "Invoer",
  },
  argTypes: {
    hasError: {
      options: [true, false],
      control: { type: "radio" },
    },
    hasWarning: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
};
