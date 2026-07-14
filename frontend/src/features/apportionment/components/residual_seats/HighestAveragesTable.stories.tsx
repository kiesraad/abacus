import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { ApportionmentState } from "@/types/generated/openapi";
import * as gte19Seats from "../../testing/gte-19-seats";
import * as gte19SeatsAndP7DrawingLots from "../../testing/gte-19-seats-and-p7-drawing-lots";
import * as gte19SeatsAndP9 from "../../testing/gte-19-seats-and-p9";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
import { getResultChanges } from "../../utils/seat-change";
import { isAbsoluteMajorityReassignmentStep } from "../../utils/steps";
import { HighestAveragesTable } from "./HighestAveragesTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <HighestAveragesTable
        steps={gte19Seats.steps}
        standings={gte19Seats.seat_assignment.standings}
        politicalGroups={gte19Seats.election.political_groups}
        resultChanges={[]}
        state={
          {
            type: "Finalised",
            deceased_candidates: [],
            lists_drawn: [],
            candidates_drawn: [],
          } satisfies ApportionmentState
        }
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Blanco (Smit, G.)", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);
  },
};

export const AbsoluteMajorityReassignment: StoryObj = {
  render: () => {
    const absoluteMajorityReassignment =
      gte19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.steps.find(
        isAbsoluteMajorityReassignmentStep,
      );
    const state = {
      type: "Finalised",
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
    } satisfies ApportionmentState;
    return (
      <HighestAveragesTable
        steps={gte19SeatsAndP9.highest_averages_steps}
        standings={gte19SeatsAndP9.seat_assignment.standings}
        politicalGroups={gte19SeatsAndP9.election.political_groups}
        resultChanges={getResultChanges([], state, absoluteMajorityReassignment)}
        state={state}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Ronde 5", "Ronde 6", "Aantal restzetels"],
      ["1", "Political Group A", "577", "", "577", "", "577", "", "577", "", "577", "", "577", "", "1 1"],
      [
        "2",
        "Political Group B",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "3",
        "Political Group C",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "4",
        "Political Group D",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "5",
        "Blanco (Jacobse, F.)",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "6",
        "Political Group F",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "1",
      ],
      ["7", "Political Group G", "624", "", "624", "", "624", "", "624", "", "624", "", "624", "", "1 0"],
      ["8", "Political Group H", "7", "", "7", "", "7", "", "7", "", "7", "", "7", "", "0"],
      ["", "Restzetel toegekend aan lijst", "2", "3", "4", "5", "6", "7", ""],
    ]);
  },
};

export const DrawingLotsForList: StoryObj = {
  render: () => {
    return (
      <HighestAveragesTable
        steps={gte19SeatsAndP7DrawingLots.steps}
        standings={gte19SeatsAndP7DrawingLots.seat_assignment.standings}
        politicalGroups={gte19SeatsAndP7DrawingLots.election.political_groups}
        resultChanges={[]}
        state={gte19SeatsAndP7DrawingLots.state}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Aantal restzetels"],
      ["1", "Partij voor de Stemmer", "50", "", "45", "5/11", "1"],
      ["2", "Algemene Partij", "46", "2/3", "46", "2/3", "0"],
      ["3", "KEUS", "46", "2/3", "46", "2/3", "0"],
      ["4", "Algemene Lijst", "46", "2/3", "46", "2/3", "0"],
      ["5", "Unie van kandidaten", "46", "2/3", "46", "2/3", "0"],
      ["6", "Lijst van stemmers", "46", "2/3", "46", "2/3", "0"],
      ["", "Restzetel toegekend aan lijst", "1", "Loting nodig", ""],
    ]);
  },
};

export const P9BeforeDrawingLots: StoryObj = {
  render: () => {
    return (
      <HighestAveragesTable
        steps={gte19SeatsAndP9DrawingLots.steps}
        standings={gte19SeatsAndP9DrawingLots.seat_assignment.standings}
        politicalGroups={gte19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={getResultChanges([], gte19SeatsAndP9DrawingLots.state)}
        state={gte19SeatsAndP9DrawingLots.state}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Ronde 5", "Ronde 6", "Aantal restzetels"],
      ["1", "De Kandidaat", "577", "", "577", "", "577", "", "577", "", "577", "", "577", "", "1 0"],
      [
        "2",
        "Kandidaten eerst!",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "3",
        "Unie voor Stemmen",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "4",
        "Stem voor kandidaten",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      ["5", "De Stemunie", "624", "1/2", "624", "1/2", "624", "1/2", "624", "1/2", "416", "1/3", "416", "1/3", "1"],
      ["6", "Altijd van de Partij", "624", "", "624", "", "624", "", "624", "", "624", "", "416", "", "1 1"],
      ["7", "Partij van de Keuze", "624", "", "624", "", "624", "", "624", "", "624", "", "624", "", "1 1"],
      ["8", "Stemmersgroep", "8", "", "8", "", "8", "", "8", "", "8", "", "8", "", "0"],
      ["", "Restzetel toegekend aan lijst", "2", "3", "4", "5", "6", "7", ""],
    ]);
  },
};

export const P9AfterDrawingLots: StoryObj = {
  render: () => {
    const absoluteMajorityReassignment =
      gte19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.steps.find(
        isAbsoluteMajorityReassignmentStep,
      );
    return (
      <HighestAveragesTable
        steps={gte19SeatsAndP9DrawingLots.steps}
        standings={gte19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned.standings}
        politicalGroups={gte19SeatsAndP9DrawingLots.election.political_groups}
        resultChanges={getResultChanges(
          [],
          gte19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned,
          absoluteMajorityReassignment,
        )}
        state={gte19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Ronde 5", "Ronde 6", "Aantal restzetels"],
      ["1", "De Kandidaat", "577", "", "577", "", "577", "", "577", "", "577", "", "577", "", "1 1"],
      [
        "2",
        "Kandidaten eerst!",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "3",
        "Unie voor Stemmen",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "4",
        "Stem voor kandidaten",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      ["5", "De Stemunie", "624", "1/2", "624", "1/2", "624", "1/2", "624", "1/2", "416", "1/3", "416", "1/3", "1"],
      ["6", "Altijd van de Partij", "624", "", "624", "", "624", "", "624", "", "624", "", "416", "", "1"],
      ["7", "Partij van de Keuze", "624", "", "624", "", "624", "", "624", "", "624", "", "624", "", "1 0"],
      ["8", "Stemmersgroep", "8", "", "8", "", "8", "", "8", "", "8", "", "8", "", "0"],
      ["", "Restzetel toegekend aan lijst", "2", "3", "4", "5", "6", "7", ""],
    ]);
  },
};

export default {};
