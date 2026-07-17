import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../testing/gte-19-seats";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";

export const Default: StoryObj = {
  render: () => {
    return <ChosenCandidatesTable chosenCandidates={gte19Seats.candidate_nomination.chosen_candidates} />;
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Naam", "Woonplaats", "Lijst"],
      ["Bakker, S. (Sophie) (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Bakker, T. (Tinus) (m)", "Test Location (BE)", "Lijst 2 – Political Group B"],
      ["Berg, H. (Henk) van den (m)", "Test Location", "Lijst 2 – Political Group B"],
      ["Berg, M. (Marijke) van den (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Groot, E. (Els) (v)", "Test Location", "Lijst 4 – Political Group D"],
      ["Jansen, A. (Arie) (m)", "Test Location", "Lijst 1 – Political Group A"],
      ["Jansen, L. (Liesbeth) (v)", "Test Location", "Lijst 2 – Political Group B"],
      ["Jong, R. (Rolf) de (m)", "Test Location", "Lijst 1 – Political Group A"],
      ["Kloosterboer, K. (Klaas) (m)", "Test Location", "Lijst 2 – Political Group B"],
      ["Kok, K. (Karin) (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Koster, E. (Eva) (v)", "Test Location", "Lijst 5 – Blanco (Smit, G.)"],
      ["Oud, J. (Johan) (m)", "Test Location", "Lijst 1 – Political Group A"],
      ["Oud, K. (Klaas) (m)", "Test Location", "Lijst 1 – Political Group A"],
      ["Oud, L. (Lidewij) (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Oud, M. (Marijke) (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Po, D. (x)", "Test Location", "Lijst 2 – Political Group B"],
      ["Ruiter, N. (Nico) (m)", "Test Location", "Lijst 3 – Political Group C"],
      ["Smit, B. (Bart) (m)", "Test Location", "Lijst 4 – Political Group D"],
      ["Visser, S. (Sophie) (v)", "Test Location", "Lijst 5 – Blanco (Smit, G.)"],
      ["Vries, J. (Johan) de (m)", "Test Location", "Lijst 1 – Political Group A"],
      ["Vries, W. (Willem) de (m)", "Test Location", "Lijst 2 – Political Group B"],
      ["Weijden, B. (Berta) van der (v)", "Test Location", "Lijst 1 – Political Group A"],
      ["Weijden, H. (Henk) van der (m)", "Test Location", "Lijst 1 – Political Group A"],
    ]);
  },
};

export default {};
