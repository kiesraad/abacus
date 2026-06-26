import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19SeatsAndP7 from "../../testing/gte-19-seats-and-p7";
import { DrawingLotsForList } from "./DrawingLotsForList";

export const Default: StoryObj = {
  render: () => {
    return (
      <DrawingLotsForList
        drawingLotsRequired={gte19SeatsAndP7.drawing_lots_required}
        options={gte19SeatsAndP7.election.political_groups.filter((pg) => gte19SeatsAndP7.options.includes(pg.number))}
      />
    );
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
  },
};

export default {};
