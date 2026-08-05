import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

import type { CorrectEntry, ResolveDifferencesFormState, WrongEntryAction } from "../utils/differences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesForm } from "./ResolveDifferencesForm";

const defaultFormState: ResolveDifferencesFormState = {
  correctEntry: undefined,
  setCorrectEntry: fn(),
  wrongEntryAction: undefined,
  setWrongEntryAction: fn(),
  correctionBlocked: false,
  correctEntryError: undefined,
  wrongEntryError: undefined,
};

const meta = {
  component: ResolveDifferencesForm,
  args: {
    firstEntryName: "Gebruiker01",
    secondEntryName: "Gebruiker02",
    formState: defaultFormState,
    onSubmit: fn(),
  },
  argTypes: {
    formState: { control: "object" },
  },
} satisfies Meta<typeof ResolveDifferencesForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [correctEntry, setCorrectEntry] = useState<CorrectEntry | undefined>(args.formState.correctEntry);
    const [wrongEntryAction, setWrongEntryAction] = useState<WrongEntryAction | undefined>(
      args.formState.wrongEntryAction,
    );

    return (
      <main className={cls.resolveDifferences}>
        <article>
          <ResolveDifferencesForm
            {...args}
            formState={{
              ...args.formState,
              correctEntry,
              setCorrectEntry: (next) => {
                args.formState.setCorrectEntry(next);
                setCorrectEntry(next);
                setWrongEntryAction(undefined);
              },
              wrongEntryAction,
              setWrongEntryAction: (next) => {
                args.formState.setWrongEntryAction(next);
                setWrongEntryAction(next);
              },
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
    const discardWrongEntry = canvas.getByRole("radio", { name: "Opnieuw laten invoeren" });

    // Nothing is selected initially and the second question is disabled
    await expect(firstEntry).not.toBeChecked();
    await expect(correctWrongEntry).toBeDisabled();
    await expect(discardWrongEntry).toBeDisabled();

    // Choosing the correct entry reports it and enables the second question
    await userEvent.click(firstEntry);
    await expect(args.formState.setCorrectEntry).toHaveBeenLastCalledWith("first");
    await expect(firstEntry).toBeChecked();
    await expect(correctWrongEntry).toBeEnabled();
    await expect(discardWrongEntry).toBeEnabled();

    // Choosing what to do with the wrong entry reports it
    await userEvent.click(discardWrongEntry);
    await expect(args.formState.setWrongEntryAction).toHaveBeenLastCalledWith("discard");
    await expect(discardWrongEntry).toBeChecked();

    // Choosing "neither" disables the second question again and sets discarding as the (disabled) answer
    await userEvent.click(discardBoth);
    await expect(args.formState.setCorrectEntry).toHaveBeenLastCalledWith("neither");
    await expect(correctWrongEntry).toBeDisabled();
    await expect(correctWrongEntry).not.toBeChecked();
    await expect(discardWrongEntry).toBeDisabled();
    await expect(discardWrongEntry).toBeChecked();

    // Submitting the form calls onSubmit
    await userEvent.click(canvas.getByRole("button", { name: "Opslaan" }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

export const FirstEntrySelected: Story = {
  ...Default,
  args: {
    formState: { ...defaultFormState, correctEntry: "first" },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Eerste invoer (Gebruiker01)" })).toBeChecked();

    // The second question is enabled once an entry is chosen
    await expect(canvas.getByRole("radio", { name: "Laten herstellen door oorspronkelijke invoerder" })).toBeEnabled();
    await expect(canvas.getByRole("radio", { name: "Opnieuw laten invoeren" })).toBeEnabled();
  },
};

export const SecondEntryHasErrors: Story = {
  ...Default,
  args: {
    formState: { ...defaultFormState, correctEntry: "second", correctionBlocked: true },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "Uit de tweede invoer blijkt dat er waarschijnlijk fouten in het papieren proces-verbaal zijn gemaakt. " +
          "Daarom kan je de eerste invoer nu niet laten herstellen door de oorspronkelijke invoerder. " +
          "Eerst moet het papieren proces-verbaal worden gecontroleerd. Dat doen we in de volgende stap. " +
          "De eerste invoer wordt verwijderd.",
      ),
    ).toBeVisible();

    const correctWrongEntry = canvas.getByRole("radio", { name: "Laten herstellen door oorspronkelijke invoerder" });
    const discardWrongEntry = canvas.getByRole("radio", { name: "Opnieuw laten invoeren" });
    await expect(correctWrongEntry).toBeDisabled();
    await expect(correctWrongEntry).not.toBeChecked();
    await expect(discardWrongEntry).toBeDisabled();
    await expect(discardWrongEntry).toBeChecked();

    // The submit button announces that resolving the errors is the next step
    await expect(canvas.getByRole("button", { name: "Verder naar fouten oplossen" })).toBeVisible();
  },
};

export const FirstEntryHasErrors: Story = {
  ...Default,
  args: {
    formState: { ...defaultFormState, correctEntry: "first", correctionBlocked: true },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "Uit de eerste invoer blijkt dat er waarschijnlijk fouten in het papieren proces-verbaal zijn gemaakt. " +
          "Daarom kan je de tweede invoer nu niet laten herstellen door de oorspronkelijke invoerder. " +
          "Eerst moet het papieren proces-verbaal worden gecontroleerd. Dat doen we in de volgende stap. " +
          "De tweede invoer wordt verwijderd.",
      ),
    ).toBeVisible();

    const correctWrongEntry = canvas.getByRole("radio", { name: "Laten herstellen door oorspronkelijke invoerder" });
    const discardWrongEntry = canvas.getByRole("radio", { name: "Opnieuw laten invoeren" });
    await expect(correctWrongEntry).toBeDisabled();
    await expect(correctWrongEntry).not.toBeChecked();
    await expect(discardWrongEntry).toBeDisabled();
    await expect(discardWrongEntry).toBeChecked();

    // The submit button announces that resolving the errors is the next step
    await expect(canvas.getByRole("button", { name: "Verder naar fouten oplossen" })).toBeVisible();
  },
};

export const WithValidationErrors: Story = {
  ...Default,
  args: {
    formState: {
      ...defaultFormState,
      correctEntryError: "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.",
      wrongEntryError: "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.",
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByText("Dit is een verplichte vraag. Maak een keuze uit de opties hieronder."),
    ).toHaveLength(2);
  },
};
