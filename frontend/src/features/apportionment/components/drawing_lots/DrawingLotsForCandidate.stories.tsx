import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import * as lt19SeatsAndP15DrawingLots from "../../testing/lt-19-seats-and-p15-drawing-lots";
import { DrawingLotsForCandidate } from "./DrawingLotsForCandidate";

export const MultipleSeatsAvailable: StoryObj = {
  render: () => {
    const list = lt19SeatsAndP15DrawingLots.election.political_groups.find(
      (pg) => pg.number === lt19SeatsAndP15DrawingLots.drawing_lots_required.list,
    )!;
    return (
      <DrawingLotsForCandidate
        drawingLotsRequired={lt19SeatsAndP15DrawingLots.drawing_lots_required}
        options={list.candidates.filter((candidate) =>
          lt19SeatsAndP15DrawingLots.drawing_lots_required.options.includes(candidate.number),
        )}
        list={formatPoliticalGroupName(list)}
      />
    );
  },
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole("list");
    // 2 lists since there is a sublist with the candidates
    await expect(lists.length).toBe(2);
    await expect(lists[0]).toBeVisible();
    const listitems = within(lists[0]!).getAllByRole("listitem");
    await expect(listitems.length).toBe(6);
    await expect(listitems[0]).toHaveTextContent("Lijst 1 – GROEP 8 heeft 5 zetels");
    await expect(listitems[1]).toHaveTextContent(
      "Er zijn 3 kandidaten die op basis van hun voorkeursstemmen in aanmerking komen voor zetel 4. Zij hebben allen 500 stemmen. Het gaat om de kandidaten:",
    );
    await expect(listitems[2]).toHaveTextContent("3. Den Mateman, D.P.K. (Damian)");
    await expect(listitems[3]).toHaveTextContent("4. Katsma, S.O. (Sammie)");
    await expect(listitems[4]).toHaveTextContent("5. Philippen, F.G. (Jory)");
    await expect(listitems[5]).toHaveTextContent("Daarom moet er geloot worden wie zetel 4 krijgt");
  },
};

export const SingleSeatAvailable: StoryObj = {
  render: () => {
    const list = lt19SeatsAndP15DrawingLots.election.political_groups.find(
      (pg) =>
        pg.number === lt19SeatsAndP15DrawingLots.drawing_lots_required_after_two_drawing_lots_candidate_assigned.list,
    )!;
    return (
      <DrawingLotsForCandidate
        drawingLotsRequired={lt19SeatsAndP15DrawingLots.drawing_lots_required_after_two_drawing_lots_candidate_assigned}
        options={list.candidates.filter((candidate) =>
          lt19SeatsAndP15DrawingLots.drawing_lots_required_after_two_drawing_lots_candidate_assigned.options.includes(
            candidate.number,
          ),
        )}
        list={formatPoliticalGroupName(list)}
      />
    );
  },
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole("list");
    // 2 lists since there is a sublist with the candidates
    await expect(lists.length).toBe(2);
    await expect(lists[0]).toBeVisible();
    const listitems = within(lists[0]!).getAllByRole("listitem");
    await expect(listitems.length).toBe(5);
    await expect(listitems[0]).toHaveTextContent("Lijst 5 – GROEP 12 heeft 1 zetel");
    await expect(listitems[1]).toHaveTextContent(
      "Er zijn 2 kandidaten die op basis van hun voorkeursstemmen in aanmerking komen voor zetel 1. Zij hebben allen 300 stemmen. Het gaat om de kandidaten:",
    );
    await expect(listitems[2]).toHaveTextContent("1. Wolfswinkel, G. (Gijsbertje)");
    await expect(listitems[3]).toHaveTextContent("2. Wolfswinkel, R. (Ruth)");
    await expect(listitems[4]).toHaveTextContent("Daarom moet er geloot worden wie zetel 1 krijgt");
  },
};

export default {};
