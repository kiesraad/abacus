import type { Meta, StoryObj } from "@storybook/react-vite";

import { FormField } from "./FormField";

type Props = {
  hasError: boolean;
  hasWarning: boolean;
};

export const DefaultFormField: StoryObj<Props> = {
  render: ({ hasError, hasWarning }) => (
    <FormField id="test-form-field" hasError={hasError} hasWarning={hasWarning}>
      <input id="test-input" type="text" aria-invalid={hasError || hasWarning ? "true" : "false"} />
    </FormField>
  ),
};

export default {
  args: {
    hasError: false,
    hasWarning: false,
  },
  argTypes: {
    hasError: {
      control: { type: "boolean" },
    },
    hasWarning: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<Props>;
