import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render, screen, within } from "@/testing/test-utils";
import { DataEntryStatusName, ValidationResults } from "@/types/generated/openapi";
import { DataEntryStructure } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { DetailNavigation } from "./DetailNavigation";

describe("DetailNavigation", () => {
  const electionMockData = getElectionMockData().election;
  const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

  const mockValidationResultsNoErrors: ValidationResults = {
    errors: [],
    warnings: [],
  };

  const mockValidationResultsWithErrors: ValidationResults = {
    errors: [
      validationResultMockData.F201, // voters_counts fields
    ],
    warnings: [
      validationResultMockData.W201, // blank_votes_count field
      validationResultMockData.F401, // political_group_votes[0]
    ],
  };

  const mockValidationResultsWithWarnings: ValidationResults = {
    errors: [],
    warnings: [
      validationResultMockData.W201, // blank_votes_count field
      validationResultMockData.F401, // political_group_votes[0]
    ],
  };

  const renderNavigation = (
    validationResults: ValidationResults,
    testStructure: DataEntryStructure = structure,
    status: DataEntryStatusName,
  ) => {
    return render(<DetailNavigation structure={testStructure} status={status} validationResults={validationResults} />);
  };

  beforeEach(() => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: undefined,
    });
  });

  test("renders overview link and links to all sections", () => {
    renderNavigation(mockValidationResultsNoErrors, structure, "second_entry_not_started");

    // Errors/warnings section is not shown when there are no errors/warnings.
    expect(screen.queryByRole("link", { name: "Fouten en waarschuwingen" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Extra onderzoek" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aantal kiezers en stemmen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verschillen D & H" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ })).toBeInTheDocument();
  });

  test("renders with empty structure", () => {
    renderNavigation(mockValidationResultsNoErrors, [], "first_entry_in_progress");

    expect(screen.queryByText("Fouten en waarschuwingen")).not.toBeInTheDocument();
  });

  test("shows correct status based on validation results", () => {
    renderNavigation(mockValidationResultsWithErrors, structure, "first_entry_has_errors");

    expect(screen.queryByRole("link", { name: "Fouten en waarschuwingen" })).toBeInTheDocument();

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen D & H" }).closest("li")!;
    expect(within(differencesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(differencesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup1Item).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows correct status based on validation results while first entry in progress", () => {
    renderNavigation(mockValidationResultsWithErrors, structure, "first_entry_in_progress");

    expect(screen.queryByRole("link", { name: "Fouten en waarschuwingen" })).not.toBeInTheDocument();

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen D & H" }).closest("li")!;
    expect(within(differencesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(differencesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup1Item).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows correct status based on validation results while second entry in progress", () => {
    renderNavigation(mockValidationResultsWithErrors, structure, "second_entry_in_progress");

    expect(screen.queryByRole("link", { name: "Fouten en waarschuwingen" })).not.toBeInTheDocument();

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen D & H" }).closest("li")!;
    expect(within(differencesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(differencesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup1Item).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows correct status based on validation results with warnings only", () => {
    renderNavigation(mockValidationResultsWithWarnings, structure, "second_entry_not_started");

    expect(screen.queryByRole("link", { name: "Waarschuwingen" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen D & H" }).closest("li")!;
    expect(within(differencesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(differencesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows no icons when there are no validation results", () => {
    renderNavigation(mockValidationResultsNoErrors, structure, "definitive");

    expect(screen.queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows overview link as active when sectionId param is null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: undefined,
    });

    renderNavigation(mockValidationResultsNoErrors, structure, "second_entry_not_started");

    const overviewItem = screen.getByRole("link", { name: "Extra onderzoek" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "false");
  });

  test("shows section link as active when sectionId param is not null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: "voters_votes_counts",
    });

    renderNavigation(mockValidationResultsNoErrors, structure, "second_entry_not_started");

    const activeItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li");
    expect(activeItem).toHaveAttribute("aria-current", "step");

    const overviewItem = screen.getByRole("link", { name: "Extra onderzoek" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "false");
  });

  test("uses correct links", () => {
    renderNavigation(mockValidationResultsNoErrors, structure, "second_entry_not_started");

    const overviewLink = screen.getByRole("link", { name: "Extra onderzoek" });
    expect(overviewLink).toHaveAttribute("href", "/elections/1/status/5/detail/extra_investigation");

    const kiezersLink = screen.getByRole("link", { name: "Aantal kiezers en stemmen" });
    expect(kiezersLink).toHaveAttribute("href", "/elections/1/status/5/detail/voters_votes_counts");
  });
});
