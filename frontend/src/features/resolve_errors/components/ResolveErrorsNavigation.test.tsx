import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render, screen, within } from "@/testing/test-utils";
import { ValidationResults } from "@/types/generated/openapi";
import { DataEntryStructure } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { ResolveErrorsNavigation } from "./ResolveErrorsNavigation";

describe("ResolveErrorsNavigation", () => {
  const electionMockData = getElectionMockData().election;
  const structure = getDataEntryStructure(electionMockData);

  const mockValidationResultsNoErrors: ValidationResults = {
    errors: [],
    warnings: [],
  };

  const mockValidationResultsWithErrors: ValidationResults = {
    errors: [
      validationResultMockData.F201, // voters_counts fields
    ],
    warnings: [
      validationResultMockData.W301, // differences_counts fields
      validationResultMockData.F401, // political_group_votes[0]
    ],
  };

  const renderNavigation = (validationResults: ValidationResults, testStructure: DataEntryStructure = structure) => {
    return render(<ResolveErrorsNavigation structure={testStructure} validationResults={validationResults} />);
  };

  beforeEach(() => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: undefined,
    });
  });

  test("renders overview link and links to all sections", () => {
    renderNavigation(mockValidationResultsNoErrors);

    expect(screen.getByRole("link", { name: "Fouten en waarschuwingen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aantal kiezers en stemmen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verschillen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ })).toBeInTheDocument();
  });

  test("renders with empty structure", () => {
    renderNavigation(mockValidationResultsNoErrors, []);

    expect(screen.getByText("Fouten en waarschuwingen")).toBeInTheDocument();
  });

  test("shows correct status based on validation results", () => {
    renderNavigation(mockValidationResultsWithErrors);

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen" }).closest("li")!;
    expect(within(differencesItem).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows no icons when there are no validation results", () => {
    renderNavigation(mockValidationResultsNoErrors);

    expect(screen.queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows overview link as active when sectionId param is null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: undefined,
    });

    renderNavigation(mockValidationResultsNoErrors);

    const overviewItem = screen.getByRole("link", { name: "Fouten en waarschuwingen" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "step");
  });

  test("shows section link as active when sectionId param is not null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: "voters_votes_counts",
    });

    renderNavigation(mockValidationResultsNoErrors);

    const activeItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li");
    expect(activeItem).toHaveAttribute("aria-current", "step");

    const overviewItem = screen.getByRole("link", { name: "Fouten en waarschuwingen" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "false");
  });

  test("uses correct links", () => {
    renderNavigation(mockValidationResultsNoErrors);

    const overviewLink = screen.getByRole("link", { name: "Fouten en waarschuwingen" });
    expect(overviewLink).toHaveAttribute("href", "/elections/1/status/5/resolve-errors");

    const kiezersLink = screen.getByRole("link", { name: "Aantal kiezers en stemmen" });
    expect(kiezersLink).toHaveAttribute("href", "/elections/1/status/5/resolve-errors/voters_votes_counts");
  });
});
