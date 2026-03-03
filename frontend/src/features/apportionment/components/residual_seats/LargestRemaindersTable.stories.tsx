import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import { LargestRemaindersTable } from "./LargestRemaindersTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <LargestRemaindersTable
        steps={lt19Seats.largest_remainder_steps}
        finalStanding={lt19Seats.seat_assignment.final_standing}
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

export default {};
