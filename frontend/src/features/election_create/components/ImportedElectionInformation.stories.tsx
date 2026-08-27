import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { csbElectionMockData, getNewElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ImportedElectionInformation } from "./ImportedElectionInformation";

const meta = {
  component: ImportedElectionInformation,
} satisfies Meta<typeof ImportedElectionInformation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GSB_CSO: Story = {
  args: {
    election: getNewElectionMockData(),
    committeeCategory: "GSB",
    pollingStations: pollingStationMockData,
    countingMethod: "CSO",
    numberOfVoters: 1234,
  },
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole("list");
    await expect(lists[0]).toBeVisible();
    await expect(lists.length).toBe(2);

    await expect(lists[0]).toBeVisible();
    const first_listitems = within(lists[0]!).getAllByRole("listitem");
    await expect(first_listitems.length).toBe(3);
    await expect(first_listitems[0]).toHaveTextContent("verkiezing: Gemeenteraadsverkiezingen 2026");
    await expect(first_listitems[1]).toHaveTextContent("type stembureau: Gemeentelijk stembureau");
    await expect(first_listitems[2]).toHaveTextContent("gebiedsaanduiding: Heemdamseburg");

    await expect(lists[1]).toBeVisible();
    const second_listitems = within(lists[1]!).getAllByRole("listitem");
    await expect(second_listitems.length).toBe(4);
    await expect(second_listitems[0]).toHaveTextContent("2 lijsten en 31 kandidaten");
    await expect(second_listitems[1]).toHaveTextContent("8 stembureaus");
    await expect(second_listitems[2]).toHaveTextContent("Centrale stemopneming");
    await expect(second_listitems[3]).toHaveTextContent("1.234 kiesgerechtigden");
  },
};

export const GSB_DSO_WithoutPollingStations: Story = {
  args: {
    election: getNewElectionMockData(),
    committeeCategory: "GSB",
    countingMethod: "DSO",
    numberOfVoters: 1234,
  },
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole("list");
    await expect(lists[0]).toBeVisible();
    await expect(lists.length).toBe(2);

    await expect(lists[0]).toBeVisible();
    const first_listitems = within(lists[0]!).getAllByRole("listitem");
    await expect(first_listitems.length).toBe(3);
    await expect(first_listitems[0]).toHaveTextContent("verkiezing: Gemeenteraadsverkiezingen 2026");
    await expect(first_listitems[1]).toHaveTextContent("type stembureau: Gemeentelijk stembureau");
    await expect(first_listitems[2]).toHaveTextContent("gebiedsaanduiding: Heemdamseburg");

    await expect(lists[1]).toBeVisible();
    const second_listitems = within(lists[1]!).getAllByRole("listitem");
    await expect(second_listitems.length).toBe(3);
    await expect(second_listitems[0]).toHaveTextContent("2 lijsten en 31 kandidaten");
    await expect(second_listitems[1]).toHaveTextContent("Decentrale stemopneming");
    await expect(second_listitems[2]).toHaveTextContent("1.234 kiesgerechtigden");
  },
};

export const CSB: Story = {
  args: {
    election: getNewElectionMockData(csbElectionMockData),
    committeeCategory: "CSB",
  },
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole("list");
    await expect(lists[0]).toBeVisible();
    await expect(lists.length).toBe(2);

    await expect(lists[0]).toBeVisible();
    const first_listitems = within(lists[0]!).getAllByRole("listitem");
    await expect(first_listitems.length).toBe(3);
    await expect(first_listitems[0]).toHaveTextContent("verkiezing: Gemeenteraadsverkiezingen 2026");
    await expect(first_listitems[1]).toHaveTextContent("type stembureau: Centraal stembureau");
    await expect(first_listitems[2]).toHaveTextContent("gebiedsaanduiding: Heemdamseburg");

    await expect(lists[1]).toBeVisible();
    const second_listitems = within(lists[1]!).getAllByRole("listitem");
    await expect(second_listitems.length).toBe(1);
    await expect(second_listitems[0]).toHaveTextContent("2 lijsten en 31 kandidaten");
  },
};
