import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import { candidate_nomination } from "../testing/19-or-more-seats";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";

describe("ChosenCandidatesTable", () => {
  test("renders a table with the chosen candidates and their localities", async () => {
    render(<ChosenCandidatesTable chosenCandidates={candidate_nomination.chosen_candidates} />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kandidaat", "Woonplaats"],
      ["Bakker, S. (Sophie)", "Test Location"],
      ["Bakker, T. (Tinus)", "Test Location"],
      ["De Jong, R. (Rolf)", "Test Location"],
      ["De Vries, J. (Johan)", "Test Location"],
      ["Groot, E. (Els)", "Test Location"],
      ["Jansen, A. (Arie)", "Test Location"],
      ["Jansen, L. (Liesbeth)", "Test Location"],
      ["Kloosterboer, K. (Klaas)", "Test Location"],
      ["Kok, K. (Karin)", "Test Location"],
      ["Koster, E. (Eva)", "Test Location"],
      ["Oud, L. (Lidewij)", "Test Location"],
      ["Oud, J. (Johan)", "Test Location"],
      ["Oud, M. (Marijke)", "Test Location"],
      ["Oud, K. (Klaas)", "Test Location"],
      ["P., D. (Drs.)", "Test Location"],
      ["Ruiter, N. (Nico)", "Test Location"],
      ["Smit, B. (Bart)", "Test Location"],
      ["Van den Berg, M. (Marijke)", "Test Location"],
      ["Van den Berg, H. (Henk)", "Test Location"],
      ["Van der Weijden, H. (Henk)", "Test Location"],
      ["Van der Weijden, B. (Berta)", "Test Location"],
      ["Visser, S. (Sophie)", "Test Location"],
      ["de Vries, W. (Willem)", "Test Location"],
    ]);
  });
});
