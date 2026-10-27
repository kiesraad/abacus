import type { Meta, StoryObj } from "@storybook/react-vite";
import { useNavigate } from "react-router";
import { expect, fn, mocked, within } from "storybook/test";

import { committeeSessionMockData, csbCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { csbElectionMockData, electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  extendedElectionStatusesCSBMock,
  extendedElectionStatusesMock,
} from "@/testing/api-mocks/ElectionStatusMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionStatus } from "./ElectionStatus";

const mockStatuses = [...extendedElectionStatusesMock];
mockStatuses[5]!.first_entry_origin = { type: "Typist", user_id: 1 };

interface StoryProps {
  addLinks: boolean;
  buttonNavigate: (path: string) => void;
}

export const GSBElectionStatusNoLinks: StoryObj<StoryProps> = {
  args: {
    addLinks: false,
  },
  render: ({ addLinks, buttonNavigate }) => {
    return (
      <TestUserProvider userRole={"coordinator_gsb"}>
        <ElectionStatus
          statuses={mockStatuses}
          committeeSession={committeeSessionMockData}
          election={electionMockData}
          addLinks={addLinks}
          navigate={buttonNavigate}
        />
      </TestUserProvider>
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
      const pollingStationsPerStatus = canvas.getByTestId("polling-stations-per-status");
      await expect(
        within(pollingStationsPerStatus).getByRole("heading", { level: 3, name: "Stembureaus per status" }),
      ).toBeVisible();
      const items = pollingStationsPerStatus.children;
      // items[0] is the heading, which we have already checked
      await expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (3)");
      await expect(items[2]).toHaveTextContent("Invoer bezig (4)");
      await expect(items[3]).toHaveTextContent("Eerste invoer klaar (3)");
      await expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (3)");
      await expect(items[5]).toHaveTextContent("Werkvoorraad (3)");

      const progress = canvas.getByTestId("progress");
      await expect(within(progress).getByRole("heading", { level: 3, name: "Voortgang" })).toBeVisible();
      await expect(canvas.getByTestId("progressbar-all")).toBeVisible();
      const bars = canvas.getByTestId("multi-outer-bar").children;
      const expectedData = [
        { index: 0, percentage: 18, class: "definitive" },
        { index: 1, percentage: 18, class: "first-entry-finished" },
        { index: 2, percentage: 25, class: "in-progress" },
        { index: 3, percentage: 18, class: "errors-and-warnings" },
        { index: 4, percentage: 18, class: "not-started" },
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
        await expect(headings[0]).toHaveTextContent("Fouten en waarschuwingen (3)");
        await expect(tables[0]).toHaveTableContent([
          ["Nummer", "Stembureau", "Te controleren"],
          ["41", "Test hogeschool 2e invoer", "Verschil 1e en 2e invoer"],
          ["37", "Dansschool Oeps nou deed ik het weer 1e invoer", "Fouten in proces-verbaal"],
          ["35", "Testschool 2e invoer", "Verschil 1e en 2e invoer"],
        ]);
      });
      await step("Data entry in progress", async () => {
        await expect(headings[1]).toHaveTextContent("Invoer bezig (4)");
        await expect(tables[1]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
          ["10", "Buurthuis de Stem 2e invoer", "Sanne Molenaar", "85%"],
          ["20", "Teststation 1e invoer", "Sanne Molenaar", "35%"],
          ["36", "Testbuurthuis 2e invoer", "Jayden Ahmen", "20%"],
          ["38", "Testmuseum 1e invoer", "Jayden Ahmen", "60%"],
        ]);

        const inProgressRows = within(tables[1]!).getAllByRole("row");
        await expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");
        await expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "35");
        await expect(within(inProgressRows[3]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
        await expect(within(inProgressRows[4]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
      });

      await step("First entry finished", async () => {
        await expect(headings[2]).toHaveTextContent("Eerste invoer klaar (3)");
        await expect(tables[2]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Afgerond"],
          ["42", "Test community center", "Geïmporteerd", "vandaag om 09:10"],
          ["40", "Test kerk", "Jayden Ahmen", "vandaag om 09:20"],
          ["39", "Test gemeentehuis", "Sanne Molenaar", "vandaag om 09:30"],
        ]);

        const tableRows = within(tables[2]!).getAllByRole("row");
        await expect(within(tableRows[2]!).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();
      });

      await step("Definitive", async () => {
        await expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (3)");
        await expect(tables[3]).toHaveTableContent([
          ["Nummer", "Stembureau", "Afgerond"],
          ["44", "Testbioscoop", "vandaag om 09:30"],
          ["34", "Testplek", "vandaag om 09:20"],
          ["5", "Het Stemstation", "vandaag om 09:10"],
        ]);
      });

      await step("Not started", async () => {
        await expect(headings[4]).toHaveTextContent("Werkvoorraad (3)");
        await expect(tables[4]).toHaveTableContent([
          ["Nummer", "Stembureau"],
          ["33", "Op Rolletjes"],
          ["43", "Het Stemhuis"],
          ["100", "Het Stemgebouw"],
        ]);
      });
    });
  },
};

export const CSBElectionStatusNoLinks: StoryObj<StoryProps> = {
  args: {
    addLinks: false,
  },
  render: ({ addLinks, buttonNavigate }) => {
    return (
      <TestUserProvider userRole={"coordinator_csb"}>
        <ElectionStatus
          statuses={extendedElectionStatusesCSBMock}
          committeeSession={csbCommitteeSessionMockData}
          election={csbElectionMockData}
          addLinks={addLinks}
          navigate={buttonNavigate}
        />
      </TestUserProvider>
    );
  },
  play: async ({ canvas, step }) => {
    await step("Heading", async () => {
      const heading = canvas.getByTestId("status-heading");
      const title = within(heading).getByRole("heading", { level: 2, name: "Statusoverzicht invoer" });
      await expect(title).toBeVisible();
    });

    await step("Progress section", async () => {
      const pollingStationsPerStatus = canvas.getByTestId("polling-stations-per-status");
      await expect(
        within(pollingStationsPerStatus).getByRole("heading", { level: 3, name: "Stembureaus per status" }),
      ).toBeVisible();
      const items = pollingStationsPerStatus.children;
      // items[0] is the heading, which we have already checked
      await expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (0)");
      await expect(items[2]).toHaveTextContent("Invoer bezig (4)");
      await expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
      await expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (0)");
      await expect(items[5]).toHaveTextContent("Werkvoorraad (5)");

      const progress = canvas.getByTestId("progress");
      await expect(within(progress).getByRole("heading", { level: 3, name: "Voortgang" })).toBeVisible();
      await expect(canvas.getByTestId("progressbar-all")).toBeVisible();
      const bars = canvas.getByTestId("multi-outer-bar").children;
      const expectedData = [
        { index: 0, percentage: 0, class: "definitive" },
        { index: 1, percentage: 10, class: "first-entry-finished" },
        { index: 2, percentage: 40, class: "in-progress" },
        { index: 3, percentage: 0, class: "errors-and-warnings" },
        { index: 4, percentage: 50, class: "not-started" },
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
      await expect(headings.length).toBe(3);
      await expect(tables.length).toBe(3);

      await step("Data entry in progress", async () => {
        await expect(headings[0]).toHaveTextContent("Invoer bezig (4)");
        await expect(tables[0]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
          ["0010", "Aardenveld 1e invoer", "Sanne Molenaar", "95%"],
          ["0009", "Bovendorp 1e invoer", "Geïmporteerd", "65%"],
          ["0007", "Hoek van Zoom 2e invoer", "Jayden Ahmen", "20%"],
          ["0008", "Zaandorp 2e invoer", "Sanne Molenaar", "45%"],
        ]);

        const inProgressRows = within(tables[0]!).getAllByRole("row");
        await expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "95");
        await expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "65");
        await expect(within(inProgressRows[3]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
        await expect(within(inProgressRows[4]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "45");
      });

      await step("First entry finished", async () => {
        await expect(headings[1]).toHaveTextContent("Eerste invoer klaar (1)");
        await expect(tables[1]).toHaveTableContent([
          ["Nummer", "Stembureau", "Invoerder", "Afgerond"],
          ["0006", "Eemstricht", "Geïmporteerd", "vandaag om 09:20"],
        ]);
      });

      await step("Not started", async () => {
        await expect(headings[2]).toHaveTextContent("Werkvoorraad (5)");
        await expect(tables[2]).toHaveTableContent([
          ["Nummer", "Stembureau"],
          ["0005", "Bloemstede"],
          ["0003", "Eksterlo"],
          ["0002", "'s-Gravenveen"],
          ["0004", "Hovenerwoud"],
          ["0001", "Juinen"],
        ]);
      });
    });

    await step("Import button", async () => {
      await expect(canvas.getByRole("button", { name: "Tellingsbestand GSB importeren" })).toBeVisible();
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
      <TestUserProvider userRole={"coordinator_gsb"}>
        <ElectionStatus
          statuses={mockStatuses}
          committeeSession={committeeSessionMockData}
          election={electionMockData}
          addLinks={addLinks}
          navigate={buttonNavigate}
        />
      </TestUserProvider>
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
        await expect(headings[0]).toHaveTextContent("Fouten en waarschuwingen (3)");
        const tableRows = within(tables[0]!).getAllByRole("row");
        navigate.mockClear();

        await expect(tableRows[1]!).toHaveTextContent("Verschil 1e en 2e invoer");
        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./9/resolve-differences");

        await expect(tableRows[2]!).toHaveTextContent("Fouten in proces-verbaal");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./5/detail");

        await expect(tableRows[3]!).toHaveTextContent("Verschil 1e en 2e invoer");
        await userEvent.click(tableRows[3]!);
        await expect(navigate).toHaveBeenLastCalledWith("./3/resolve-differences");
      });

      await step("Data entry in progress", async () => {
        await expect(headings[1]).toHaveTextContent("Invoer bezig (4)");
        const tableRows = within(tables[1]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./15/detail");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./13/detail");
        await userEvent.click(tableRows[3]!);
        await expect(navigate).toHaveBeenLastCalledWith("./4/detail");
        await userEvent.click(tableRows[4]!);
        await expect(navigate).toHaveBeenLastCalledWith("./6/detail");
      });

      await step("First entry finished", async () => {
        await expect(headings[2]).toHaveTextContent("Eerste invoer klaar (3)");
        const tableRows = within(tables[2]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./10/detail");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./8/detail");
        await userEvent.click(tableRows[3]!);
        await expect(navigate).toHaveBeenLastCalledWith("./7/detail");
      });

      await step("Definitive", async () => {
        await expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (3)");
        const tableRows = within(tables[3]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).toHaveBeenLastCalledWith("./12/detail");
        await userEvent.click(tableRows[2]!);
        await expect(navigate).toHaveBeenLastCalledWith("./2/detail");
        await userEvent.click(tableRows[3]!);
        await expect(navigate).toHaveBeenLastCalledWith("./14/detail");
      });

      await step("Not started", async () => {
        await expect(headings[4]).toHaveTextContent("Werkvoorraad (3)");
        const tableRows = within(tables[4]!).getAllByRole("row");
        navigate.mockClear();

        await userEvent.click(tableRows[1]!);
        await expect(navigate).not.toHaveBeenCalled();
        await userEvent.click(tableRows[2]!);
        await expect(navigate).not.toHaveBeenCalled();
        await userEvent.click(tableRows[3]!);
        await expect(navigate).not.toHaveBeenCalled();
      });
    });
  },
};

export const Empty: StoryObj<StoryProps> = {
  render: ({ addLinks, buttonNavigate }) => (
    <TestUserProvider userRole={"coordinator_gsb"}>
      <ElectionStatus
        statuses={[]}
        election={electionMockData}
        committeeSession={committeeSessionMockData}
        addLinks={addLinks}
        navigate={buttonNavigate}
      />
    </TestUserProvider>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Er zijn nog geen stembureaus toegevoegd voor deze verkiezing."),
    ).toBeVisible();

    const pollingStationsPerStatus = canvas.getByTestId("polling-stations-per-status");
    await expect(
      within(pollingStationsPerStatus).getByRole("heading", { level: 3, name: "Stembureaus per status" }),
    ).toBeVisible();
    const items = pollingStationsPerStatus.children;
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
    return (
      <TestUserProvider userRole={"coordinator_gsb"}>
        <ElectionStatus
          statuses={mockStatuses}
          committeeSession={{ ...committeeSessionMockData, number: 2 }}
          election={electionMockData}
          addLinks={addLinks}
          navigate={buttonNavigate}
        />
      </TestUserProvider>
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
    <TestUserProvider userRole={"coordinator_gsb"}>
      <ElectionStatus
        statuses={[]}
        election={electionMockData}
        committeeSession={{ ...committeeSessionMockData, number: 2 }}
        addLinks={addLinks}
        navigate={buttonNavigate}
      />
    </TestUserProvider>
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
