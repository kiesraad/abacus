import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import * as gte19SeatsAndP7DrawingLots from "../../testing/gte-19-seats-and-p7-drawing-lots";
import * as lt19SeatsAndP7DrawingLots from "../../testing/lt-19-seats-and-p7-drawing-lots";
import { DrawingLotsForList } from "./DrawingLotsForList";

export const HighestAverage: StoryObj = {
  render: () => {
    return (
      <DrawingLotsForList
        drawingLotsRequired={gte19SeatsAndP7DrawingLots.drawing_lots_required}
        options={gte19SeatsAndP7DrawingLots.election.political_groups.filter((pg) =>
          gte19SeatsAndP7DrawingLots.options.includes(pg.number),
        )}
      />
    );
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(5);
    await expect(listitems[0]).toHaveTextContent("Er zijn 4 restzetels te verdelen");
    await expect(listitems[1]).toHaveTextContent("Restzetel 2 kan niet automatisch worden toegewezen");
    await expect(listitems[2]).toHaveTextContent(
      "De partij met het hoogste gemiddeld aantal stemmen na het toewijzen van de restzetel krijgt de restzetel",
    );
    await expect(listitems[3]).toHaveTextContent(
      "Lijst 2 – Algemene Partij, Lijst 3 – KEUS, Lijst 4 – Algemene Lijst, Lijst 5 – Unie van kandidaten en Lijst 6 – Lijst van stemmers hebben samen het hoogste gemiddeld aantal stemmen per zetel (46 2/3 stemmen)",
    );
    await expect(listitems[4]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");
  },
};

export const LargestRemainder: StoryObj = {
  render: () => {
    return (
      <DrawingLotsForList
        drawingLotsRequired={lt19SeatsAndP7DrawingLots.drawing_lots_required}
        options={lt19SeatsAndP7DrawingLots.election.political_groups.filter((pg) =>
          lt19SeatsAndP7DrawingLots.options.includes(pg.number),
        )}
      />
    );
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list");
    await expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    await expect(listitems.length).toBe(5);
    await expect(listitems[0]).toHaveTextContent("Er zijn 2 restzetels te verdelen");
    await expect(listitems[1]).toHaveTextContent("Restzetel 2 kan niet automatisch worden toegewezen");
    await expect(listitems[2]).toHaveTextContent(
      "De partij met het grootste overschot aan stemmen krijgt de restzetel",
    );
    await expect(listitems[3]).toHaveTextContent(
      "Lijst 2 – Politieke Groep der Kandidaten, Lijst 3 – Stemalliantie, Lijst 4 – Stem voor de Partij, Lijst 5 – Alliantie van Partijen en Lijst 6 – Unie voor Stemmen hebben samen het grootste overschot (0 stemmen)",
    );
    await expect(listitems[4]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");
  },
};

export default {};
