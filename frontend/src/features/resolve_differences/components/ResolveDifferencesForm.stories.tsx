import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

import { t } from "@/i18n/translate";
import type { ResolveDifferencesAction } from "@/types/generated/openapi";

import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesForm } from "./ResolveDifferencesForm";

const meta = {
  component: ResolveDifferencesForm,
  args: {
    firstEntryName: "Gebruiker01",
    secondEntryName: "Gebruiker02",
    action: undefined,
    setAction: fn(),
    validationError: undefined,
    onSubmit: fn(),
  },
  argTypes: {
    action: { control: false },
    validationError: { control: "text" },
  },
} satisfies Meta<typeof ResolveDifferencesForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [action, setAction] = useState<ResolveDifferencesAction | undefined>(args.action);

    return (
      <main className={cls.resolveDifferences}>
        <article>
          <ResolveDifferencesForm
            {...args}
            action={action}
            setAction={(next) => {
              args.setAction(next);
              setAction(next);
            }}
          />
        </article>
      </main>
    );
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { level: 3, name: t("resolve_differences.form_question") })).toBeVisible();
    await expect(canvas.getByText(t("resolve_differences.form_content"))).toBeVisible();

    const firstEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.options.keep_first_entry", { name: args.firstEntryName }),
    });
    const secondEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.options.keep_second_entry", { name: args.secondEntryName }),
    });
    const discardBoth = canvas.getByRole("radio", {
      name: t("resolve_differences.options.discard_both_entries"),
    });

    // No option is selected initially
    await expect(firstEntry).not.toBeChecked();
    await expect(secondEntry).not.toBeChecked();
    await expect(discardBoth).not.toBeChecked();

    // Selecting an option reports the action and checks the radio exclusively
    await userEvent.click(secondEntry);
    await expect(args.setAction).toHaveBeenLastCalledWith("keep_second_entry");
    await expect(secondEntry).toBeChecked();
    await expect(firstEntry).not.toBeChecked();
    await expect(discardBoth).not.toBeChecked();

    // Switching to another option updates the selection
    await userEvent.click(discardBoth);
    await expect(args.setAction).toHaveBeenLastCalledWith("discard_both_entries");
    await expect(discardBoth).toBeChecked();
    await expect(secondEntry).not.toBeChecked();

    // Submitting the form calls onSubmit
    await userEvent.click(canvas.getByRole("button", { name: t("save") }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

export const FirstEntrySelected: Story = {
  ...Default,
  args: {
    action: "keep_first_entry",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("radio", { name: t("resolve_differences.options.keep_first_entry", { name: "Gebruiker01" }) }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: t("resolve_differences.options.keep_second_entry", { name: "Gebruiker02" }) }),
    ).not.toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: t("resolve_differences.options.discard_both_entries") }),
    ).not.toBeChecked();
  },
};

export const WithValidationError: Story = {
  ...Default,
  args: {
    validationError: t("resolve_differences.required_error"),
  },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText(args.validationError!)).toBeVisible();
  },
};
