import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <UniqueHighestAveragesTable
        steps={lt19Seats.highest_average_steps}
        largestRemainderSteps={lt19Seats.largest_remainder_steps}
        finalStanding={lt19Seats.seat_assignment.final_standing}
        politicalGroups={lt19Seats.election.political_groups}
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

export default {};
