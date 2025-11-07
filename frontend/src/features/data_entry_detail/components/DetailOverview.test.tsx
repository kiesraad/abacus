import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render } from "@/testing/test-utils";
import { ValidationResults } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { DetailOverview } from "../components/DetailOverview";

function getValidationResults(section: HTMLElement | null) {
  if (!section) return [];

  return within(section)
    .getAllByRole("listitem")
    .filter((li) => li.matches(".error, .warning"))
    .map((item) => {
      const heading = within(item).getByRole("heading");

      return {
        code: heading.textContent.split(" ")[0],
        hasContent: item.getElementsByClassName("content").length > 0,
        hasActions: within(item).queryByRole("list") !== null,
      };
    });
}

describe("DetailOverview", () => {
  const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

  test("render sections with errors and warnings", () => {
    const results: ValidationResults = {
      errors: [
        validationResultMockData.F101,
        validationResultMockData.F201,
        validationResultMockData.F302,
        validationResultMockData.F401,
      ],
      warnings: [validationResultMockData.W201],
    };

    render(<DetailOverview structure={structure} results={results} />);

    const extra_investigation = screen.queryByRole("region", { name: "Extra onderzoek B1-1" });
    expect(extra_investigation).toBeInTheDocument();
    expect(getValidationResults(extra_investigation)).toEqual([
      {
        code: "F.101",
        hasContent: true,
        hasActions: false,
      },
    ]);

    const voters_votes_counts = screen.queryByRole("region", { name: "Aantal kiezers en stemmen B1-3.1 en 3.2" });
    expect(voters_votes_counts).toBeInTheDocument();
    expect(getValidationResults(voters_votes_counts)).toEqual([
      {
        code: "F.201",
        hasContent: true,
        hasActions: true,
      },
      {
        code: "W.201",
        hasContent: false,
        hasActions: true,
      },
    ]);

    const differences_counts = screen.queryByRole("region", { name: "Verschillen D & H B1-3.3" });
    expect(differences_counts).toBeInTheDocument();
    expect(getValidationResults(differences_counts)).toEqual([
      {
        code: "F.302",
        hasContent: false,
        hasActions: false,
      },
    ]);

    const political_group_votes_1 = screen.queryByRole("region", { name: "Lijst 1 - Vurige Vleugels Partij" });
    expect(political_group_votes_1).toBeInTheDocument();
    expect(getValidationResults(political_group_votes_1)).toEqual([
      {
        code: "F.401",
        hasContent: true,
        hasActions: true,
      },
    ]);

    const political_group_votes_2 = screen.queryByRole("region", { name: "Lijst 2 - Wijzen van Water en Wind" });
    expect(political_group_votes_2).not.toBeInTheDocument();
  });
});
