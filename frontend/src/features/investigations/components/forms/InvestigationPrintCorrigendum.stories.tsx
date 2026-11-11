import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { InvestigationPrintCorrigendum } from "./InvestigationPrintCorrigendum";

const meta = {
  component: InvestigationPrintCorrigendum,
  parameters: {
    needsElection: true,
    needsMessages: true,
  },
} satisfies Meta<typeof InvestigationPrintCorrigendum>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CSO: Story = {
  args: {
    pollingStationId: 1,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
    await expect(await canvas.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
    await expect(
      await canvas.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
    ).toBeVisible();

    const lists = await canvas.findAllByRole("list");
    await expect(lists).toHaveLength(4);
    const firstListItems = await within(lists[0]!).findAllByRole("listitem");
    await expect(firstListItems).toHaveLength(2);
    await expect(firstListItems[0]!).toHaveTextContent("Download het corrigendum en druk het af.");
    await expect(firstListItems[1]!).toHaveTextContent(
      [
        "Tip: print alleen B1 - 1 Aanleiding en opdracht onderzoek.",
        "Druk de rest pas af als uit het onderzoek blijkt dat een hertelling moet worden gedaan.",
      ].join(" "),
    );

    const links = await canvas.findAllByRole("link");
    await expect(links).toHaveLength(3);
    await expect(links[0]).toHaveTextContent(["Download corrigendum voor stembureau 33", "Na 14-2 Bijlage 1"].join(""));
    await expect(links[1]).toHaveTextContent("Terug naar alle onderzoeken");
    await expect(links[2]).toHaveTextContent("Verder naar bevindingen");
  },
};

export const DSO: Story = {
  args: {
    pollingStationId: 1,
  },
  parameters: {
    countingMethod: "DSO",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 2, name: "Print het corrigendum" })).toBeVisible();
    await expect(await canvas.findByRole("heading", { level: 3, name: "Voer het onderzoek uit" })).toBeVisible();
    await expect(
      await canvas.findByRole("heading", { level: 3, name: "Na het onderzoek van het gemeentelijk stembureau" }),
    ).toBeVisible();

    const lists = await canvas.findAllByRole("list");
    await expect(lists).toHaveLength(4);
    const firstListItems = await within(lists[0]!).findAllByRole("listitem");
    await expect(firstListItems).toHaveLength(2);
    await expect(firstListItems[0]!).toHaveTextContent("Download het corrigendum en druk het af.");
    await expect(firstListItems[1]!).toHaveTextContent(
      [
        "Tip: print alleen 1. Onderzoek naar telresultaten.",
        "Druk de rest pas af als uit het onderzoek blijkt dat een hertelling moet worden gedaan.",
      ].join(" "),
    );

    const links = await canvas.findAllByRole("link");
    await expect(links).toHaveLength(3);
    await expect(links[0]).toHaveTextContent(["Download corrigendum voor stembureau 33", "Na 14-1, versie 2"].join(""));
    await expect(links[1]).toHaveTextContent("Terug naar alle onderzoeken");
    await expect(links[2]).toHaveTextContent("Verder naar bevindingen");
  },
};
