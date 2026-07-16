import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { ApportionmentState } from "@/types/generated/openapi";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
import * as lt19SeatsAndP10AndDeceasedCandidates from "../../testing/lt-19-seats-and-p10-and-deceased-candidates";
import { buildAssignmentTableData } from "../../utils/seat-change";
import { LargestRemaindersTable } from "./LargestRemaindersTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <LargestRemaindersTable
        steps={lt19Seats.largest_remainder_steps}
        standings={lt19Seats.seat_assignment.standings}
        politicalGroups={lt19Seats.election.political_groups}
        resultChanges={[]}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);
  },
};

export const P9AndP10: StoryObj = {
  render: () => {
    const state = {
      type: "Finalised",
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
    } satisfies ApportionmentState;
    const dataset = buildAssignmentTableData(lt19SeatsAndP9AndP10.seat_assignment.steps, state);

    return (
      <LargestRemaindersTable
        steps={dataset.LargestRemainderAssignment.steps}
        standings={lt19SeatsAndP9AndP10.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP9AndP10.election.political_groups}
        resultChanges={dataset.LargestRemainderAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "1 5", "189", "2/15", "2 , 3 0"],
      ["2", "Political Group B", "2", "296", "7/15", "1"],
      ["3", "Political Group C", "1", "226", "11/15", "1"],
      ["4", "Political Group D", "1", "195", "11/15", "2 1"],
      ["5", "Blanco (Jacobse, F.)", "1", "112", "11/15", "1"],
    ]);
  },
};

export const P9BeforeDrawingLots: StoryObj = {
  render: () => {
    const dataset = buildAssignmentTableData(
      lt19SeatsAndP9DrawingLots.seat_assignment.steps,
      lt19SeatsAndP9DrawingLots.state,
    );

    return (
      <LargestRemaindersTable
        steps={dataset.LargestRemainderAssignment.steps}
        standings={lt19SeatsAndP9DrawingLots.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={dataset.LargestRemainderAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "De partijdigen", "7", "170", "9/15", "1 0"],
      ["2", "Kiezers nu!", "1", "170", "12/15", "1 1"],
      ["3", "Lijst De Partij", "1", "170", "12/15", "1 1"],
      ["4", "Partij voor de Opkomst", "1", "170", "12/15", "1 1"],
      ["5", "STEM", "1", "168", "12/15", "0"],
      ["6", "Lijst van stemmers", "1", "168", "12/15", "0"],
    ]);
  },
};

export const P9AfterDrawingLots: StoryObj = {
  render: () => {
    const dataset = buildAssignmentTableData(
      lt19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.steps,
      lt19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned,
    );

    return (
      <LargestRemaindersTable
        steps={dataset.LargestRemainderAssignment.steps}
        standings={lt19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.standings}
        politicalGroups={lt19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={dataset.LargestRemainderAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "De partijdigen", "7", "170", "9/15", "1 1"],
      ["2", "Kiezers nu!", "1", "170", "12/15", "1"],
      ["3", "Lijst De Partij", "1", "170", "12/15", "1 0"],
      ["4", "Partij voor de Opkomst", "1", "170", "12/15", "1"],
      ["5", "STEM", "1", "168", "12/15", "0"],
      ["6", "Lijst van stemmers", "1", "168", "12/15", "0"],
    ]);
  },
};

export const P10: StoryObj = {
  render: () => {
    const state = {
      type: "Finalised",
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
    } satisfies ApportionmentState;
    const dataset = buildAssignmentTableData(lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.steps, state);

    return (
      <LargestRemaindersTable
        steps={dataset.LargestRemainderAssignment.steps}
        standings={lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP10AndDeceasedCandidates.election.political_groups}
        resultChanges={dataset.LargestRemainderAssignment.resultChanges}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1 0"],
    ]);
  },
};

export default {};
