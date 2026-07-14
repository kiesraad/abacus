import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
import * as lt19SeatsAndP10AndDeceasedCandidates from "../../testing/lt-19-seats-and-p10-and-deceased-candidates";

import { getResultChanges, splitResultChanges } from "../../utils/seat-change";
import { isAbsoluteMajorityReassignmentStep, isListExhaustionRemovalStep } from "../../utils/steps";
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
    const absoluteMajorityReassignment = lt19SeatsAndP9AndP10.seat_assignment.steps.find(
      isAbsoluteMajorityReassignmentStep,
    );
    const listExhaustionSteps = lt19SeatsAndP9AndP10.seat_assignment.steps.filter(isListExhaustionRemovalStep);
    const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);
    return (
      <LargestRemaindersTable
        steps={lt19SeatsAndP9AndP10.largest_remainder_steps_part_1.concat(
          lt19SeatsAndP9AndP10.largest_remainder_steps_part_2,
        )}
        standings={lt19SeatsAndP9AndP10.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP9AndP10.election.political_groups}
        resultChanges={getResultChanges(
          [],
          {
            type: "Finalised",
            deceased_candidates: [],
            lists_drawn: [],
            candidates_drawn: [],
          },
          absoluteMajorityReassignment,
          residualSeatRemovalSteps,
        )}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "5", "189", "2/15", "1 , 2 0"],
      ["2", "Political Group B", "2", "296", "7/15", "1"],
      ["3", "Political Group C", "1", "226", "11/15", "1"],
      ["4", "Political Group D", "1", "195", "11/15", "1 1"],
      ["5", "Blanco (Jacobse, F.)", "1", "112", "11/15", "1"],
    ]);
  },
};

export const P9BeforeDrawingLots: StoryObj = {
  render: () => {
    return (
      <LargestRemaindersTable
        steps={lt19SeatsAndP9DrawingLots.largest_remainder_steps}
        standings={lt19SeatsAndP9DrawingLots.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={getResultChanges([], lt19SeatsAndP9DrawingLots.state)}
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
    return (
      <LargestRemaindersTable
        steps={lt19SeatsAndP9DrawingLots.largest_remainder_steps}
        standings={lt19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.standings}
        politicalGroups={lt19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={getResultChanges(
          [],
          lt19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned,
          lt19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.steps.find(
            isAbsoluteMajorityReassignmentStep,
          ),
        )}
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
    const absoluteMajorityReassignment = lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.steps.find(
      isAbsoluteMajorityReassignmentStep,
    );
    const listExhaustionSteps =
      lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.steps.filter(isListExhaustionRemovalStep);
    const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);
    const resultChanges = getResultChanges(
      [],
      {
        type: "Finalised",
        deceased_candidates: [],
        lists_drawn: [],
        candidates_drawn: [],
      },
      absoluteMajorityReassignment,
      residualSeatRemovalSteps,
    );
    const { largestRemainderResultChanges } = splitResultChanges(
      resultChanges,
      lt19SeatsAndP10AndDeceasedCandidates.largest_remainder_steps,
    );
    return (
      <LargestRemaindersTable
        steps={lt19SeatsAndP10AndDeceasedCandidates.largest_remainder_steps}
        standings={lt19SeatsAndP10AndDeceasedCandidates.seat_assignment.standings}
        politicalGroups={lt19SeatsAndP10AndDeceasedCandidates.election.political_groups}
        resultChanges={largestRemainderResultChanges}
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
