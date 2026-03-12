import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../testing/gte-19-seats";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <ChosenCandidatesTable
        chosenCandidates={gte19Seats.candidate_nomination.chosen_candidates}
        politicalGroups={gte19Seats.election.political_groups}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Naam", "Woonplaats", "Lijst"],
      ["Bakker, S. (Sophie) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Bakker, T. (Tinus) (m)", "Test Location (BE)", "Lijst 2 - Political Group B"],
      ["Van den Berg, H. (Henk) (m)", "Test Location", "Lijst 2 - Political Group B"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Groot, E. (Els) (v)", "Test Location", "Lijst 4 - Political Group D"],
      ["Jansen, A. (Arie) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Jansen, L. (Liesbeth) (v)", "Test Location", "Lijst 2 - Political Group B"],
      ["De Jong, R. (Rolf) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Kloosterboer, K. (Klaas) (m)", "Test Location", "Lijst 2 - Political Group B"],
      ["Kok, K. (Karin) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Koster, E. (Eva) (v)", "Test Location", "Lijst 5 - Blanco (Smit, G.)"],
      ["Oud, J. (Johan) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, K. (Klaas) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, L. (Lidewij) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, M. (Marijke) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Po, D. (x)", "Test Location", "Lijst 2 - Political Group B"],
      ["Ruiter, N. (Nico) (m)", "Test Location", "Lijst 3 - Political Group C"],
      ["Smit, B. (Bart) (m)", "Test Location", "Lijst 4 - Political Group D"],
      ["Visser, S. (Sophie) (v)", "Test Location", "Lijst 5 - Blanco (Smit, G.)"],
      ["De Vries, J. (Johan) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["De Vries, W. (Willem) (m)", "Test Location", "Lijst 2 - Political Group B"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location", "Lijst 1 - Political Group A"],
    ]);
  },
};

export default {};
