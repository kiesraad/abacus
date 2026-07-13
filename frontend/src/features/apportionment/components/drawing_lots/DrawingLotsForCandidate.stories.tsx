import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import * as lt19SeatsAndP15DrawingLots from "../../testing/lt-19-seats-and-p15-drawing-lots";
import { DrawingLotsForCandidate } from "./DrawingLotsForCandidate";

export const EqualCandidatesAndSeatsAvailable: StoryObj = {
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
        list={list.name}
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
    await expect(listitems[0]).toHaveTextContent("GROEP 8 heeft 5 zetels");
    await expect(listitems[1]).toHaveTextContent(
      "Er zijn 2 kandidaten die op basis van hun voorkeursstemmen in aanmerking komen voor zetel 2. Zij hebben allen 550 stemmen. Het gaat om de kandidaten:",
    );
    await expect(listitems[2]).toHaveTextContent("2. Wiertz, K. (Kris)");
    await expect(listitems[3]).toHaveTextContent("6. Arets, T.E. (Tiemen)");
    await expect(listitems[4]).toHaveTextContent(
      "Volgens artikel P 15 van de Kieswet moet er geloot worden wie zetel 2 krijgt",
    );
  },
};

export const MoreCandidatesThanSeatsAvailable: StoryObj = {
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
        list={list.name}
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
    await expect(listitems[0]).toHaveTextContent("GROEP 9 heeft 4 zetels");
    await expect(listitems[1]).toHaveTextContent(
      "Er zijn 3 kandidaten die op basis van hun voorkeursstemmen in aanmerking komen voor zetel 4. Zij hebben allen 350 stemmen. Het gaat om de kandidaten:",
    );
    await expect(listitems[2]).toHaveTextContent("2. Oorschot, W.");
    await expect(listitems[3]).toHaveTextContent("4. Van Bekking, W.");
    await expect(listitems[4]).toHaveTextContent("5. De Vegt, F.W.");
    await expect(listitems[5]).toHaveTextContent(
      "Volgens artikel P 15 van de Kieswet moet er geloot worden wie zetel 4 krijgt",
    );
  },
};

export default {};
