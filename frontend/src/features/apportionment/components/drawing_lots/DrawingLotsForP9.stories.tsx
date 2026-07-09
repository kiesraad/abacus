import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
import { DrawingLotsForP9 } from "./DrawingLotsForP9";

export const AbsoluteMajorityHighestAverage: StoryObj = {
  render: () => {
    return <DrawingLotsForP9 drawingLotsRequired={gte19SeatsAndP9DrawingLots.drawing_lots_required} />;
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(4);
    await expect(listitems[0]).toHaveTextContent(
      "Lijst 1 heeft de volstrekte meerderheid van stemmen gekregen, maar heeft niet de volstrekte meerderheid aan zetels.",
    );
    await expect(listitems[1]).toHaveTextContent("De laatste restzetel moet worden afgestaan aan lijst 1.");
    await expect(listitems[2]).toHaveTextContent(
      "Lijst 6 en 7 hebben met hetzelfde gemiddeld aantal stemmen de laatste restzetels gekregen.",
    );
    await expect(listitems[3]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");
  },
};

export const AbsoluteMajorityLargestRemainder: StoryObj = {
  render: () => {
    return <DrawingLotsForP9 drawingLotsRequired={lt19SeatsAndP9DrawingLots.drawing_lots_required} />;
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(4);
    await expect(listitems[0]).toHaveTextContent(
      "Lijst 1 heeft de volstrekte meerderheid van stemmen gekregen, maar heeft niet de volstrekte meerderheid aan zetels.",
    );
    await expect(listitems[1]).toHaveTextContent("De laatste restzetel moet worden afgestaan aan lijst 1.");
    await expect(listitems[2]).toHaveTextContent(
      "Lijst 2, 3 en 4 hebben met hetzelfde overschot aan stemmen de laatste restzetels gekregen.",
    );
    await expect(listitems[3]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");
  },
};

export default {};
