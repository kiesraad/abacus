import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
import { getResultChanges } from "../../utils/seat-change";
import { isAbsoluteMajorityReassignmentStep } from "../../utils/steps";
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

export default {};
