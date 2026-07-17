import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP10AndDeceasedCandidates from "../../testing/lt-19-seats-and-p10-and-deceased-candidates";
import { buildAssignmentTableData } from "../../utils/seat-change";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const Default: StoryObj = {
  render: () => {
    const tableData = buildAssignmentTableData(lt19Seats.seat_assignment.steps, lt19Seats.state);

    return (
      <UniqueHighestAveragesTable
        steps={tableData.UniqueHighestAverageAssignment.steps}
        largestRemainderSteps={lt19Seats.largest_remainder_steps}
        standings={lt19Seats.seat_assignment.standings}
        politicalGroups={lt19Seats.election.political_groups}
        resultChanges={tableData.UniqueHighestAverageAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Reeds toegewezen", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "11", "67", "4/12", "1"],
      ["2", "Political Group B", "1", "30", "", "0"],
      ["3", "Political Group C", "0", "58", "", "1"],
      ["4", "Political Group D", "0", "57", "", "1"],
      ["5", "Blanco (Smit, G.)", "0", "56", "", "0"],
      ["6", "Political Group F", "0", "55", "", "0"],
      ["7", "Political Group G", "0", "54", "", "0"],
      ["8", "Political Group H", "0", "52", "", "0"],
    ]);
  },
};

export const P10: StoryObj = {
  render: () => {
    const tableData = buildAssignmentTableData(
      lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.steps,
      lt19SeatsAndP10AndDeceasedCandidates.state,
    );

    return (
      <UniqueHighestAveragesTable
        steps={tableData.UniqueHighestAverageAssignment.steps}
        largestRemainderSteps={tableData.LargestRemainderAssignment.steps}
        standings={lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP10AndDeceasedCandidates.election.political_groups}
        resultChanges={tableData.UniqueHighestAverageAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Reeds toegewezen", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "11", "67", "4/12", "2 0"],
      ["2", "Political Group B", "0", "59", "", "1"],
      ["3", "Political Group C", "0", "58", "", "1"],
      ["4", "Political Group D", "0", "57", "", "1"],
      ["5", "Blanco (Smit, G.)", "0", "56", "", "1"],
      ["6", "Political Group F", "0", "55", "", "1"],
      ["7", "Political Group G", "0", "54", "", "0"],
      ["8", "Political Group H", "0", "53", "", "0"],
    ]);
  },
};

export default {};
