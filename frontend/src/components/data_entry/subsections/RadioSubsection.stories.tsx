import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { useArgs } from "storybook/preview-api";

import type { RadioSubsection, SectionValues } from "@/types/types";

import { RadioSubsectionComponent } from "./RadioSubsection";

const radioSubsection: RadioSubsection = {
  type: "radio",
  short_title: "voters_votes_counts.short_title",
  error: "form_errors.FORM_VALIDATION_RESULT_REQUIRED",
  path: "voters_counts.poll_card_count",
  options: [
    {
      value: "yes",
      label: "yes",
      short_label: "yes",
      autoFocusInput: true,
    },
    {
      value: "no",
      label: "no",
      short_label: "no",
    },
  ],
};

const meta = {
  component: RadioSubsectionComponent,
  args: {
    subsection: radioSubsection,
    currentValues: {},
    defaultProps: {
      errorsAndWarningsAccepted: false,
    },
    readOnly: false,
  },
} satisfies Meta<typeof RadioSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radio: Story = {
  args: {
    setValues: () => {},
  },
  render: function Render(args) {
    const [{ currentValues }, updateArgs] = useArgs<{ currentValues: SectionValues }>();

    const setValues = (path: string, value: string) => {
      action("setValues")(path, value);
      updateArgs({ currentValues: { ...currentValues, [path]: value } });
    };

    return <RadioSubsectionComponent {...args} currentValues={currentValues} setValues={setValues} />;
  },
};
