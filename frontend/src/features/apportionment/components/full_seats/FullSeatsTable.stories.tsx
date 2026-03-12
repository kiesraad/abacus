import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../../testing/gte-19-seats";
import { FullSeatsTable } from "./FullSeatsTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <FullSeatsTable
        finalStanding={gte19Seats.seat_assignment.final_standing}
        politicalGroups={gte19Seats.election.political_groups}
        quota={gte19Seats.seat_assignment.quota}
        resultChanges={[]}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "Political Group A", "600", ":", "52", "4/23", "=", "11"],
      ["2", "Political Group B", "302", ":", "52", "4/23", "=", "5"],
      ["3", "Political Group C", "98", ":", "52", "4/23", "=", "1"],
      ["4", "Political Group D", "99", ":", "52", "4/23", "=", "1"],
      ["5", "Blanco (Smit, G.)", "101", ":", "52", "4/23", "=", "1"],
    ]);
  },
};

export default {};
