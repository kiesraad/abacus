import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../../testing/gte-19-seats";
import { HighestAveragesTable } from "./HighestAveragesTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <HighestAveragesTable
        steps={gte19Seats.steps}
        finalStanding={gte19Seats.seat_assignment.final_standing}
        politicalGroups={gte19Seats.election.political_groups}
        resultChanges={[]}
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
      ["5", "", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);
  },
};

export default {};
