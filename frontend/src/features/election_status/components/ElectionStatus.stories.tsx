import { useNavigate } from "react-router";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, mocked, within } from "storybook/test";

import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { electionStatusesMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";

import { ElectionStatus } from "./ElectionStatus";

const today = new Date();
today.setHours(10, 20);
const mockStatuses = [...electionStatusesMock];
mockStatuses[5]!.first_entry_user_id = 1;

interface StoryProps {
  addLinks: boolean;
  buttonNavigate: (path: string) => void;
}

export const ElectionStatusNoLinks: StoryObj<StoryProps> = {
  args: {
    addLinks: false,
  },
  render: ({ addLinks, buttonNavigate }) => {
    return (
      <ElectionStatus
        statuses={mockStatuses}
        committeeSession={committeeSessionMockData}
        election={electionMockData}
        pollingStations={pollingStationMockData}
        addLinks={addLinks}
        navigate={buttonNavigate}
      />
    );
  },
  play: async ({ canvas, step }) => {
    await step("Heading", async () => {
      const heading = canvas.getByTestId("status-heading");
      const title = within(heading).getByRole("heading", { level: 2, name: "Statusoverzicht invoer" });
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
      await expect(items[2]).toHaveTextContent("Invoer bezig (2)");
      await expect(items[3]).toHaveTextContent("Eerste invoer klaar (2)");
      await expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
      await expect(items[5]).toHaveTextContent("Werkvoorraad (1)");

      const progress = canvas.getByTestId("progress");
      await expect(within(progress).getByRole("heading", { level: 3, name: "Voortgang" })).toBeVisible();
      await expect(canvas.getByTestId("progressbar-all")).toBeVisible();
      const bars = canvas.getByTestId("multi-outer-bar").children;
      const expectedData = [
        { index: 0, percentage: 13, class: "definitive" },
        { index: 1, percentage: 25, class: "first-entry-finished" },
        { index: 2, percentage: 25, class: "in-progress" },
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
          ["35", "Testschool 2e invoer", "Verschil 1e en 2e invoer"],
          ["37", "Dansschool Oeps nou deed ik het weer 1e invoer", "Fouten in proces-verbaal"],
        ]);
      });
      await step("Data entry in progress", async () => {
        await expect(headings[1]).toHaveTextContent("Invoer bezig (2)");
        await expect(tables[1]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
          ["36", "Testbuurthuis 2e invoer", "Jayden Ahmen", "20%"],
          ["38", "Testmuseum 1e invoer", "Sanne Molenaar", "60%"],
        ]);

        const inProgressRows = within(tables[1]!).getAllByRole("row");
        await expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
        await expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
      });

      await step("First entry finished", async () => {
        await expect(headings[2]).toHaveTextContent("Eerste invoer klaar (2)");
        await expect(tables[2]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Afgerond"],
          ["39", "Test gemeentehuis", "Sanne Molenaar", "vandaag om 10:20"],
          ["40", "Test kerk", "Jayden Ahmen", "vandaag om 10:20"],
        ]);

        const tableRows = within(tables[2]!).getAllByRole("row");
        await expect(within(tableRows[2]!).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();
      });

      await step("Definitive", async () => {
        await expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
        await expect(tables[3]).toHaveTableContent([
          ["Nummer", "Stembureau", "Afgerond"],
          ["34", "Testplek", "vandaag om 10:20"],
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

const navigate = fn().mockName("navigate");

export const ElectionStatusWithLinks: StoryObj<StoryProps> = {
  args: {
    addLinks: true,
  },
  beforeEach: () => {
    mocked(useNavigate).mockImplementation(() => navigate);
  },
  render: ({ addLinks, buttonNavigate }) => {
    return (
      <ElectionStatus
        statuses={mockStatuses}
        committeeSession={committeeSessionMockData}
        election={electionMockData}
        pollingStations={pollingStationMockData}
        addLinks={addLinks}
        navigate={buttonNavigate}
      />
    );
  },
  play: async ({ canvas, step, userEvent }) => {
    await step("Navigate to data entry detail", async () => {
      const tablesRoot = canvas.getByRole("article");
      const headings = within(tablesRoot).getAllByRole("heading", { level: 3 });
      const tables = within(tablesRoot).getAllByRole("table");
      await expect(headings.length).toBe(5);
      await expect(tables.length).toBe(5);

      await step("Errors and warnings", async () => {
        await expect(headings[0]).toHaveTextContent("Fouten en waarschuwingen (2)");
        const tableRows = within(tables[0]!).getAllByRole("row");
        navigate.mockClear();

        await expect(tableRows[1]!).toHaveTextContent("Verschil 1e en 2e invoer");
        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./3/resolve-differences");

        await expect(tableRows[2]!).toHaveTextContent("Fouten in proces-verbaal");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./5/detail");
      });

      await step("Data entry in progress", async () => {
        await expect(headings[1]).toHaveTextContent("Invoer bezig (2)");
        const tableRows = within(tables[1]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./4/detail");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./6/detail");
      });

      await step("First entry finished", async () => {
        await expect(headings[2]).toHaveTextContent("Eerste invoer klaar (2)");
        const tableRows = within(tables[2]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./7/detail");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./8/detail");
      });

      await step("Definitive", async () => {
        await expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
        const tableRows = within(tables[3]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./2/detail");
      });

      await step("Not started", async () => {
        await expect(headings[4]).toHaveTextContent("Werkvoorraad (1)");
        const tableRows = within(tables[4]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).not.toHaveBeenCalled();
      });
    });
  },
};

export const Empty: StoryObj<StoryProps> = {
  render: ({ addLinks, buttonNavigate }) => (
    <ElectionStatus
      statuses={[]}
      election={electionMockData}
      committeeSession={committeeSessionMockData}
      pollingStations={[]}
      addLinks={addLinks}
      navigate={buttonNavigate}
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
  render: ({ addLinks, buttonNavigate }) => {
    const today = new Date();
    today.setHours(10, 20);

    return (
      <ElectionStatus
        statuses={mockStatuses}
        committeeSession={{ ...committeeSessionMockData, number: 2 }}
        election={electionMockData}
        pollingStations={pollingStationMockData}
        addLinks={addLinks}
        navigate={buttonNavigate}
      />
    );
  },
  play: async ({ canvas, step }) => {
    await step("Heading", async () => {
      const heading = canvas.getByTestId("status-heading");
      const title = within(heading).getByRole("heading", { level: 2, name: "Statusoverzicht invoer" });
      await expect(title).toBeVisible();

      const buttons = within(heading).getAllByRole("button");
      await expect(buttons.length).toBe(1);
      await expect(buttons[0]).toHaveTextContent("Onderzoeken");
    });
  },
};

export const NextSessionEmpty: StoryObj<StoryProps> = {
  render: ({ addLinks, buttonNavigate }) => (
    <ElectionStatus
      statuses={[]}
      election={electionMockData}
      committeeSession={{ ...committeeSessionMockData, number: 2 }}
      pollingStations={[]}
      addLinks={addLinks}
      navigate={buttonNavigate}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Er zijn nog geen onderzoeken met gecorrigeerde uitkomst voor deze zitting."),
    ).toBeVisible();
  },
};

export default {
  args: {
    addLinks: true,
    buttonNavigate: fn(),
  },
  argTypes: {
    addLinks: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  parameters: {
    needsUsers: true,
  },
} satisfies Meta<StoryProps>;
