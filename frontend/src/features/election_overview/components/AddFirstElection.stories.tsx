import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { AddFirstElection } from "./AddFirstElection";

const meta = {
  component: AddFirstElection,
} satisfies Meta<typeof AddFirstElection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IsAdministrator: Story = {
  render: () => {
    return (
      <TestUserProvider userRole="administrator">
        <AddFirstElection />
      </TestUserProvider>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Nog geen verkiezingen ingesteld" })).toBeVisible();

    await expect(
      await canvas.findByText(
        "Om Abacus in te richten voor het invoeren van telresultaten, heb je de volgende bestanden nodig:",
      ),
    ).toBeVisible();
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(3);
    await expect(listitems[0]).toHaveTextContent("Verkiezingsdefinitie (krijg je van het centraal stembureau)");
    await expect(listitems[1]).toHaveTextContent("Kandidatenlijsten (krijg je van het centraal stembureau)");
    await expect(listitems[2]).toHaveTextContent("Overzicht stembureaus in jouw gemeente (voor GSB)");
    await expect(
      await canvas.findByText("Zorg dat de bestanden op deze computer staan voordat je verder gaat."),
    ).toBeVisible();

    const link = await canvas.findByRole("link", { name: "Verkiezing toevoegen" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/create");
  },
};

export const IsCoordinator: Story = {
  render: () => {
    return (
      <TestUserProvider userRole="coordinator_gsb">
        <AddFirstElection />
      </TestUserProvider>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Nog geen verkiezingen ingesteld" })).toBeVisible();

    await expect(
      await canvas.findByText(
        "Om Abacus in te richten voor het invoeren van telresultaten, heb je de volgende bestanden nodig:",
      ),
    ).toBeVisible();
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(3);
    await expect(listitems[0]).toHaveTextContent("Verkiezingsdefinitie (krijg je van het centraal stembureau)");
    await expect(listitems[1]).toHaveTextContent("Kandidatenlijsten (krijg je van het centraal stembureau)");
    await expect(listitems[2]).toHaveTextContent("Overzicht stembureaus in jouw gemeente (voor GSB)");
    await expect(
      await canvas.findByText("Zorg dat de bestanden op deze computer staan voordat je verder gaat."),
    ).toBeVisible();

    await expect(canvas.queryByRole("link", { name: "Verkiezing toevoegen" })).not.toBeInTheDocument();
  },
};
