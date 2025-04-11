import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { candidate_nomination } from "../testing/gte-19-seats";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";

describe("ChosenCandidatesTable", () => {
  test("renders a table with the chosen candidates and their localities", async () => {
    render(<ChosenCandidatesTable chosenCandidates={candidate_nomination.chosen_candidates} />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kandidaat", "Woonplaats"],
      ["Bakker, S. (Sophie) (v)", "Test Location"],
      ["Bakker, T. (Tinus) (m)", "Test Location"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location"],
      ["Van den Berg, H. (Henk) (m)", "Test Location"],
      ["Groot, E. (Els) (v)", "Test Location"],
      ["Jansen, A. (Arie) (m)", "Test Location"],
      ["Jansen, L. (Liesbeth) (v)", "Test Location"],
      ["De Jong, R. (Rolf) (m)", "Test Location"],
      ["Kloosterboer, K. (Klaas) (m)", "Test Location"],
      ["Kok, K. (Karin) (v)", "Test Location"],
      ["Koster, E. (Eva) (v)", "Test Location"],
      ["Oud, L. (Lidewij) (v)", "Test Location"],
      ["Oud, J. (Johan) (m)", "Test Location"],
      ["Oud, M. (Marijke) (v)", "Test Location"],
      ["Oud, K. (Klaas) (m)", "Test Location"],
      ["Po, D. (x)", "Test Location"],
      ["Ruiter, N. (Nico) (m)", "Test Location"],
      ["Smit, B. (Bart) (m)", "Test Location"],
      ["Visser, S. (Sophie) (v)", "Test Location"],
      ["De Vries, J. (Johan) (m)", "Test Location"],
      ["De Vries, W. (Willem) (m)", "Test Location"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location"],
    ]);
  });
});
