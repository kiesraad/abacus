import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";

import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionStatusResponseEntry } from "@/types/generated/openapi";

import { ElectionStatus } from "./ElectionStatus";

const today = new Date();
today.setHours(10, 20);
const mockStatuses: ElectionStatusResponseEntry[] = [
  {
    polling_station_id: 1,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 2,
    status: "second_entry_not_started",
    first_entry_user_id: 1,
    finished_at: today.toISOString(),
  },
  {
    polling_station_id: 3,
    status: "first_entry_in_progress",
    first_entry_user_id: 1,
    first_entry_progress: 60,
  },
  {
    polling_station_id: 4,
    status: "second_entry_in_progress",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 20,
  },
  {
    polling_station_id: 5,
    status: "definitive",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 100,
    finished_at: today.toISOString(),
  },
  {
    polling_station_id: 6,
    status: "first_entry_in_progress",
    first_entry_user_id: 1,
    first_entry_progress: 25,
  },
  {
    polling_station_id: 7,
    status: "entries_different",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    first_entry_progress: 100,
    second_entry_progress: 100,
  },
  {
    polling_station_id: 8,
    status: "first_entry_has_errors",
    first_entry_user_id: 1,
    first_entry_progress: 100,
  },
];

interface StoryProps {
  addLinks: boolean;
  navigate: (path: string) => void;
}

export const DefaultElectionStatus: StoryObj<StoryProps> = {
  render: ({ addLinks, navigate }) => {
    return (
      <ElectionStatus
        statuses={mockStatuses}
        committeeSession={committeeSessionMockData}
        election={electionMockData}
        pollingStations={pollingStationMockData}
        addLinks={addLinks}
        navigate={navigate}
      />
    );
  },
  play: async ({ canvas, step }) => {
    await step("Heading", async () => {
      const heading = canvas.getByTestId("status-heading");
      const title = within(heading).getByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" });
      await expect(title).toBeVisible();

      const buttons = within(heading).getAllByRole("button");
      await expect(buttons.length).toBe(1);
      await expect(buttons[0]).toHaveTextContent("Stembureaus");
    });

    await step("Progress section", async () => {
      const pollinStationsPerStatus = canvas.getByTestId("polling-stations-per-status");
      await expect(
        within(pollinStationsPerStatus).getByRole("heading", { level: 3, name: "Stembureaus per status" }),
      ).toBeVisible();
      const items = pollinStationsPerStatus.children;
      // items[0] is the heading, which we have already checked
      await expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (2)");
      await expect(items[2]).toHaveTextContent("Invoer bezig (3)");
      await expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
      await expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
      await expect(items[5]).toHaveTextContent("Werkvoorraad (1)");

      const progress = canvas.getByTestId("progress");
      await expect(within(progress).getByRole("heading", { level: 3, name: "Voortgang" })).toBeVisible();
      await expect(canvas.getByTestId("progressbar-all")).toBeVisible();
      const bars = canvas.getByTestId("multi-outer-bar").children;
      const expectedData = [
        { index: 0, percentage: 13, class: "definitive" },
        { index: 1, percentage: 13, class: "first-entry-finished" },
        { index: 2, percentage: 38, class: "in-progress" },
        { index: 3, percentage: 25, class: "errors-and-warnings" },
        { index: 4, percentage: 13, class: "not-started" },
      ];

      for (const data of expectedData) {
        const bar = bars[data.index];
        await expect(bar).toHaveClass(data.class);
        await expect(bar).toHaveAttribute("style", `width: ${data.percentage}%;`);
      }
    });

    await step("Main section", async () => {
      const tablesRoot = canvas.getByRole("article");
      const headings = within(tablesRoot).getAllByRole("heading", { level: 3 });
      const tables = within(tablesRoot).getAllByRole("table");
      await expect(headings.length).toBe(5);
      await expect(tables.length).toBe(5);

      await step("Errors and warnings", async () => {
        await expect(headings[0]).toHaveTextContent("Fouten en waarschuwingen (2)");
        await expect(tables[0]).toHaveTableContent([
          ["Nummer", "Stembureau", "Te controleren"],
          ["39", "Test gemeentehuis 2e invoer", "Verschil 1e en 2e invoer"],
          ["40", "Test kerk 1e invoer", "Fouten in proces-verbaal"],
        ]);
      });
      await step("Data entry in progress", async () => {
        await expect(headings[1]).toHaveTextContent("Invoer bezig (3)");
        await expect(tables[1]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
          ["35", "Testschool 1e invoer", "Sanne Molenaar", "60%"],
          ["36", "Testbuurthuis 2e invoer", "Jayden Ahmen", "20%"],
          ["38", "Testmuseum 1e invoer", "Sanne Molenaar", "25%"],
        ]);

        const inProgressRows = within(tables[1]!).getAllByRole("row");
        await expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
        await expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
        await expect(within(inProgressRows[3]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
      });

      await step("First entry finished", async () => {
        await expect(headings[2]).toHaveTextContent("Eerste invoer klaar (1)");
        await expect(tables[2]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Afgerond op"],
          ["34", "Testplek", "Sanne Molenaar", "vandaag 10:20"],
        ]);
      });

      await step("Definitive", async () => {
        await expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
        await expect(tables[3]).toHaveTableContent([
          ["Nummer", "Stembureau", "Afgerond op"],
          ["37", "Dansschool Oeps nou deed ik het weer", "vandaag 10:20"],
        ]);
      });

      await step("Not started", async () => {
        await expect(headings[4]).toHaveTextContent("Werkvoorraad (1)");
        await expect(tables[4]).toHaveTableContent([
          ["Nummer", "Stembureau"],
          ["33", "Op Rolletjes"],
        ]);
      });
    });
  },
};

export const Empty: StoryObj<StoryProps> = {
  render: ({ addLinks, navigate }) => (
    <ElectionStatus
      statuses={[]}
      election={electionMockData}
      committeeSession={committeeSessionMockData}
      pollingStations={[]}
      addLinks={addLinks}
      navigate={navigate}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Er zijn nog geen stembureaus toegevoegd voor deze verkiezing."),
    ).toBeVisible();

    const pollinStationsPerStatus = canvas.getByTestId("polling-stations-per-status");
    await expect(
      within(pollinStationsPerStatus).getByRole("heading", { level: 3, name: "Stembureaus per status" }),
    ).toBeVisible();
    const items = pollinStationsPerStatus.children;
    // items[0] is the heading, which we have already checked
    await expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (0)");
    await expect(items[2]).toHaveTextContent("Invoer bezig (0)");
    await expect(items[3]).toHaveTextContent("Eerste invoer klaar (0)");
    await expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (0)");
    await expect(items[5]).toHaveTextContent("Werkvoorraad (0)");
  },
};

export const NextSession: StoryObj<StoryProps> = {
  render: ({ addLinks, navigate }) => {
    const today = new Date();
    today.setHours(10, 20);

    return (
      <ElectionStatus
        statuses={mockStatuses}
        committeeSession={{ ...committeeSessionMockData, number: 2 }}
        election={electionMockData}
        pollingStations={pollingStationMockData}
        addLinks={addLinks}
        navigate={navigate}
      />
    );
  },
  play: async ({ canvas, step }) => {
    await step("Heading", async () => {
      const heading = canvas.getByTestId("status-heading");
      const title = within(heading).getByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" });
      await expect(title).toBeVisible();

      const buttons = within(heading).getAllByRole("button");
      await expect(buttons.length).toBe(1);
      await expect(buttons[0]).toHaveTextContent("Onderzoeken");
    });
  },
};

export const NextSessionEmpty: StoryObj<StoryProps> = {
  render: ({ addLinks, navigate }) => (
    <ElectionStatus
      statuses={[]}
      election={electionMockData}
      committeeSession={{ ...committeeSessionMockData, number: 2 }}
      pollingStations={[]}
      addLinks={addLinks}
      navigate={navigate}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Er zijn nog geen onderzoeken met gecorrigeerde uitslag voor deze zitting."),
    ).toBeVisible();
  },
};

export default {
  args: {
    addLinks: true,
    navigate: fn(),
  },
  argTypes: {
    addLinks: {
      options: [true, false],
      control: { type: "radio" },
    },
    navigate: { action: "navigate" },
  },
  parameters: {
    needsUsers: true,
  },
} satisfies Meta<StoryProps>;
