import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import {
  importedSubCommitteesMockData,
  pendingSubCommitteesMockData,
  subCommitteesMockData,
} from "@/testing/api-mocks/SubCommitteeMockData";

import { SubCommitteeKeysOverview } from "./SubCommitteeKeysOverview";

const meta = {
  component: SubCommitteeKeysOverview,
  args: {
    subCommittees: subCommitteesMockData,
    electionId: 1,
  },
} satisfies Meta<typeof SubCommitteeKeysOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Voeg de publieke sleutels van alle GSB's in de kieskring toe" }),
    ).toBeVisible();

    await expect(canvas.getByRole("heading", { level: 3, name: "Nog toe te voegen publieke sleutels" })).toBeVisible();
    const [pendingTable, importedTable] = canvas.getAllByRole("table");
    await expect(pendingTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau"],
      ["0358", "Aalsmeer"],
      ["0362", "Amstelveen"],
      ["0375", "Beverwijk"],
      ["0376", "Blaricum"],
    ]);

    await expect(canvas.getByRole("heading", { level: 3, name: "Geïmporteerde publieke sleutels" })).toBeVisible();
    await expect(importedTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau", "Sleutels"],
      ["0377", "Bloemendaal", "1"],
      ["0384", "Diemen", "2"],
      ["1942", "Gooise Meren", "4"],
      ["0392", "Haarlem", "1"],
    ]);
  },
};

export const AllPending: Story = {
  args: {
    subCommittees: pendingSubCommitteesMockData,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 3, name: "Nog toe te voegen publieke sleutels" })).toBeVisible();
    await expect(canvas.queryByRole("heading", { level: 3, name: "Geïmporteerde publieke sleutels" })).toBeNull();
    await expect(canvas.getAllByRole("table")).toHaveLength(1);
  },
};

export const AllImported: Story = {
  args: {
    subCommittees: importedSubCommitteesMockData,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("heading", { level: 3, name: "Nog toe te voegen publieke sleutels" })).toBeNull();
    await expect(canvas.getByRole("heading", { level: 3, name: "Geïmporteerde publieke sleutels" })).toBeVisible();
    await expect(canvas.getAllByRole("table")).toHaveLength(1);
  },
};
