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
      name: t("resolve_differences.options.keep_first_and_discard_second", { name: args.firstEntryName }),
    });
    const secondEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.options.keep_second_and_discard_first", { name: args.secondEntryName }),
    });
    const discardBoth = canvas.getByRole("radio", {
      name: t("resolve_differences.options.discard_both"),
    });

    // No option is selected initially
    await expect(firstEntry).not.toBeChecked();
    await expect(secondEntry).not.toBeChecked();
    await expect(discardBoth).not.toBeChecked();

    // Selecting an option reports the action and checks the radio exclusively
    await userEvent.click(secondEntry);
    await expect(args.setAction).toHaveBeenLastCalledWith("keep_second_and_discard_first");
    await expect(secondEntry).toBeChecked();
    await expect(firstEntry).not.toBeChecked();
    await expect(discardBoth).not.toBeChecked();

    // Switching to another option updates the selection
    await userEvent.click(discardBoth);
    await expect(args.setAction).toHaveBeenLastCalledWith("discard_both");
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
    action: "keep_first_and_discard_second",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("radio", {
        name: t("resolve_differences.options.keep_first_and_discard_second", { name: "Gebruiker01" }),
      }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("radio", {
        name: t("resolve_differences.options.keep_second_and_discard_first", { name: "Gebruiker02" }),
      }),
    ).not.toBeChecked();
    await expect(canvas.getByRole("radio", { name: t("resolve_differences.options.discard_both") })).not.toBeChecked();
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
