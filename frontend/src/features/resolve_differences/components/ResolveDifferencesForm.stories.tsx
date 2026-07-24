import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

import { t } from "@/i18n/translate";

import type { CorrectEntry, WrongEntryAction } from "../utils/differences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesForm } from "./ResolveDifferencesForm";

const meta = {
  component: ResolveDifferencesForm,
  args: {
    firstEntryName: "Gebruiker01",
    secondEntryName: "Gebruiker02",
    correctEntry: undefined,
    setCorrectEntry: fn(),
    wrongEntryAction: undefined,
    setWrongEntryAction: fn(),
    correctEntryError: undefined,
    wrongEntryError: undefined,
    onSubmit: fn(),
  },
  argTypes: {
    correctEntry: { control: false },
    wrongEntryAction: { control: false },
    correctEntryError: { control: "text" },
    wrongEntryError: { control: "text" },
  },
} satisfies Meta<typeof ResolveDifferencesForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [correctEntry, setCorrectEntry] = useState<CorrectEntry | undefined>(args.correctEntry);
    const [wrongEntryAction, setWrongEntryAction] = useState<WrongEntryAction | undefined>(args.wrongEntryAction);

    return (
      <main className={cls.resolveDifferences}>
        <article>
          <ResolveDifferencesForm
            {...args}
            correctEntry={correctEntry}
            setCorrectEntry={(next) => {
              args.setCorrectEntry(next);
              setCorrectEntry(next);
            }}
            wrongEntryAction={wrongEntryAction}
            setWrongEntryAction={(next) => {
              args.setWrongEntryAction(next);
              setWrongEntryAction(next);
            }}
          />
        </article>
      </main>
    );
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { level: 3, name: t("resolve_differences.form_question") })).toBeVisible();
    await expect(canvas.getByText(t("resolve_differences.form_content"))).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 3, name: /Wat wil je doen/ })).toBeVisible();

    const firstEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.options.keep_first_and_discard_second", { name: args.firstEntryName }),
    });
    const discardBoth = canvas.getByRole("radio", {
      name: t("resolve_differences.options.discard_both"),
    });
    const correctWrongEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.wrong_entry_options.correct"),
    });
    const reenterWrongEntry = canvas.getByRole("radio", {
      name: t("resolve_differences.wrong_entry_options.reenter"),
    });

    // Nothing is selected initially and the second question is disabled
    await expect(firstEntry).not.toBeChecked();
    await expect(correctWrongEntry).toBeDisabled();
    await expect(reenterWrongEntry).toBeDisabled();

    // Choosing the correct entry reports it and enables the second question
    await userEvent.click(firstEntry);
    await expect(args.setCorrectEntry).toHaveBeenLastCalledWith("first");
    await expect(firstEntry).toBeChecked();
    await expect(correctWrongEntry).toBeEnabled();
    await expect(reenterWrongEntry).toBeEnabled();

    // Choosing what to do with the wrong entry reports it
    await userEvent.click(reenterWrongEntry);
    await expect(args.setWrongEntryAction).toHaveBeenLastCalledWith("reenter");
    await expect(reenterWrongEntry).toBeChecked();

    // Choosing "neither" disables the second question again
    await userEvent.click(discardBoth);
    await expect(args.setCorrectEntry).toHaveBeenLastCalledWith("neither");
    await expect(correctWrongEntry).toBeDisabled();
    await expect(reenterWrongEntry).toBeDisabled();

    // Submitting the form calls onSubmit
    await userEvent.click(canvas.getByRole("button", { name: t("save") }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

export const FirstEntrySelected: Story = {
  ...Default,
  args: {
    correctEntry: "first",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("radio", {
        name: t("resolve_differences.options.keep_first_and_discard_second", { name: "Gebruiker01" }),
      }),
    ).toBeChecked();

    // The second question is enabled once an entry is chosen
    await expect(
      canvas.getByRole("radio", { name: t("resolve_differences.wrong_entry_options.correct") }),
    ).toBeEnabled();
    await expect(
      canvas.getByRole("radio", { name: t("resolve_differences.wrong_entry_options.reenter") }),
    ).toBeEnabled();
  },
};

export const WithValidationErrors: Story = {
  ...Default,
  args: {
    correctEntryError: t("resolve_differences.required_error"),
    wrongEntryError: t("resolve_differences.required_error"),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(t("resolve_differences.required_error"))).toHaveLength(2);
  },
};
