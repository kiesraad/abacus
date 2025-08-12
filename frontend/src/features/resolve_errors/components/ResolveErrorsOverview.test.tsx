import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ResolveErrorsOverview } from "@/features/resolve_errors/components/ResolveErrorsOverview";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render } from "@/testing/test-utils";
import { ValidationResults } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

function getValidationResults(section: HTMLElement | null) {
  return (
    within(section!)
      .getAllByRole("listitem")
      // Assume that each list item starts with the validation result code with a dot
      .map((item) => item.textContent.split(" ")[0])
  );
}

describe("ResolveErrorsOverview", () => {
  const structure = getDataEntryStructure(electionMockData);

  test("render sections with errors and warnings", () => {
    const results: ValidationResults = {
      errors: [
        validationResultMockData.F201, // voters_counts
        validationResultMockData.F401, // political_group_votes[0]
      ],
      warnings: [
        validationResultMockData.W201, // votes_counts
      ],
    };

    render(<ResolveErrorsOverview structure={structure} results={results} />);

    const voters_votes_counts = screen.queryByRole("region", { name: "Toegelaten kiezers en uitgebrachte stemmen" });
    expect(voters_votes_counts).toBeInTheDocument();
    expect(getValidationResults(voters_votes_counts)).toEqual(["F.201", "W.201"]);

    const differences_counts = screen.queryByRole("region", {
      name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
    });
    expect(differences_counts).not.toBeInTheDocument();

    const political_group_votes_1 = screen.queryByRole("region", { name: "Lijst 1 - Vurige Vleugels Partij" });
    expect(political_group_votes_1).toBeInTheDocument();
    expect(getValidationResults(political_group_votes_1)).toEqual(["F.401"]);

    const political_group_votes_2 = screen.queryByRole("region", { name: "Lijst 2 - Wijzen van Water en Wind" });
    expect(political_group_votes_2).not.toBeInTheDocument();
  });
});
