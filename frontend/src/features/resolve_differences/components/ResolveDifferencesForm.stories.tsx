import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

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
    await expect(canvas.getByRole("heading", { level: 3, name: "Welke invoer klopt?" })).toBeVisible();
    await expect(
      canvas.getByText(
        "De resultaten van dit stembureau zijn pas definitief als er twee gelijke invoeren zijn. " +
          "Kies de invoer die overeenkomt met het papieren proces-verbaal.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 3, name: /Wat wil je doen/ })).toBeVisible();

    const firstEntry = canvas.getByRole("radio", { name: "Eerste invoer (Gebruiker01)" });
    const discardBoth = canvas.getByRole("radio", { name: "Geen van beide: alles opnieuw invoeren" });
    const correctWrongEntry = canvas.getByRole("radio", { name: "Laten herstellen door oorspronkelijke invoerder" });
    const reenterWrongEntry = canvas.getByRole("radio", { name: "Opnieuw laten invoeren" });

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

    // Choosing "neither" disables the second question again and clears its answer
    await userEvent.click(discardBoth);
    await expect(args.setCorrectEntry).toHaveBeenLastCalledWith("neither");
    await expect(args.setWrongEntryAction).toHaveBeenLastCalledWith(undefined);
    await expect(correctWrongEntry).toBeDisabled();
    await expect(reenterWrongEntry).toBeDisabled();
    await expect(reenterWrongEntry).not.toBeChecked();

    // Submitting the form calls onSubmit
    await userEvent.click(canvas.getByRole("button", { name: "Opslaan" }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

export const FirstEntrySelected: Story = {
  ...Default,
  args: {
    correctEntry: "first",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Eerste invoer (Gebruiker01)" })).toBeChecked();

    // The second question is enabled once an entry is chosen
    await expect(canvas.getByRole("radio", { name: "Laten herstellen door oorspronkelijke invoerder" })).toBeEnabled();
    await expect(canvas.getByRole("radio", { name: "Opnieuw laten invoeren" })).toBeEnabled();
  },
};

export const WithValidationErrors: Story = {
  ...Default,
  args: {
    correctEntryError: "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.",
    wrongEntryError: "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByText("Dit is een verplichte vraag. Maak een keuze uit de opties hieronder."),
    ).toHaveLength(2);
  },
};
