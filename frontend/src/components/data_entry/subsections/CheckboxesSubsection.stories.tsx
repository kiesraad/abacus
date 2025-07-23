import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import type { CheckboxesSubsection, SectionValues } from "@/types/types";

import { CheckboxesSubsectionComponent } from "./CheckboxesSubsection";

const checkboxesSubsection: CheckboxesSubsection = {
  type: "checkboxes",
  short_title: "voters_votes_counts.short_title",
  error_path: "voters_counts.poll_card_count",
  error_message: "form_errors.FORM_VALIDATION_RESULT_REQUIRED",
  options: [
    {
      path: "voters_counts.poll_card_count",
      label: "voters_votes_counts.voters_counts.poll_card_count",
      short_label: "voters_votes_counts.voters_counts.poll_card_count",
    },
    {
      path: "voters_counts.proxy_certificate_count",
      label: "voters_votes_counts.voters_counts.proxy_certificate_count",
      short_label: "voters_votes_counts.voters_counts.proxy_certificate_count",
    },
  ],
};

const meta = {
  component: CheckboxesSubsectionComponent,
  args: {
    subsection: checkboxesSubsection,
    currentValues: {
      "voters_counts.proxy_certificate_count": "true",
    },
    setValues: fn(),
    // @ts-expect-error: errorsAndWarnings is mapped using argTypes, which is not understood by TypeScript
    errorsAndWarnings: "no errors or warnings",
    readOnly: false,
  },
  argTypes: {
    currentValues: {
      control: false,
    },
    errorsAndWarnings: {
      control: "radio",
      options: ["no errors or warnings", "error"],
      mapping: {
        "no errors or warnings": undefined,
        error: new Map([["data.voters_counts.poll_card_count", "error"]]),
      },
    },
  },
} satisfies Meta<typeof CheckboxesSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checkboxes: Story = {
  render: function Render(args) {
    const [currentValues, setCurrentValues] = useState<SectionValues>({
      "voters_counts.proxy_certificate_count": "true",
    });

    const setValues = (path: string, value: string) => {
      args.setValues(path, value);
      setCurrentValues((prev) => ({ ...prev, [path]: value }));
    };

    return <CheckboxesSubsectionComponent {...args} currentValues={currentValues} setValues={setValues} />;
  },
  play: async ({ canvas, step }) => {
    await step("Test initial state", async () => {
      const checkboxes = canvas.getAllByRole("checkbox");
      await expect(checkboxes).toHaveLength(2);

      await expect(checkboxes[0]).not.toBeChecked();
      await expect(checkboxes[1]).toBeChecked();
    });

    await step("Test checkbox interactions", async () => {
      const checkboxes = canvas.getAllByRole("checkbox");
      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      await expect(checkboxes[0]).toBeChecked();
      await expect(checkboxes[1]).not.toBeChecked();
    });

    await step("Reset to initial state", async () => {
      const checkboxes = canvas.getAllByRole("checkbox");
      for (const checkbox of checkboxes) {
        await userEvent.click(checkbox);
      }

      await expect(checkboxes[0]).not.toBeChecked();
      await expect(checkboxes[1]).toBeChecked();
    });
  },
};
