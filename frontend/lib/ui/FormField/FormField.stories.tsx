import type { Story } from "@ladle/react";

import { ResultCode } from "@kiesraad/api";

import { FormField } from "./FormField";

type Props = {
  error?: ResultCode;
};

export const DefaultFormField: Story<Props> = ({ error }) => (
  <FormField
    error={
      error
        ? [
            {
              id: "test-input",
              code: error,
            },
          ]
        : undefined
    }
  >
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
      options: [
        undefined,
        "F201",
        "F202",
        "F203",
        "F204",
        "F301",
        "F302",
        "F303",
        "F304",
        "F401",
        "W201",
        "W202",
        "W203",
        "W204",
        "W205",
        "W206",
        "W207",
        "W208",
        "W209",
        "W210",
        "W301",
        "W302",
        "W303",
        "W304",
        "W305",
        "W306",
      ],
      defaultValue: "F201",
      control: { type: "radio" },
    },
  },
};
