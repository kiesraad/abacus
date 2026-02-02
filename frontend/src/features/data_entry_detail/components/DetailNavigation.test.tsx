import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { render, screen, within } from "@/testing/test-utils";
import type { DataEntryStatusName, ValidationResults } from "@/types/generated/openapi";
import type { DataEntryStructure } from "@/types/types";
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
      validationResultMockData.F401, // political_group_votes.0
    ],
    warnings: [
      validationResultMockData.W201, // blank_votes_count field
    ],
  };

  const mockValidationResultsWithWarnings: ValidationResults = {
    errors: [],
    warnings: [
      validationResultMockData.W201, // blank_votes_count field
    ],
  };

  const renderNavigation = (
    validationResults: ValidationResults,
    status: DataEntryStatusName,
    testStructure: DataEntryStructure = structure,
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
    renderNavigation(mockValidationResultsWithWarnings, "first_entry_finalised");

    const items = screen.getAllByRole("link").map((link) => link.textContent);
    expect(items).toEqual([
      "Waarschuwingen",
      "Extra onderzoek",
      "Verschillen met stembureau",
      "Aantal kiezers en stemmen",
      "Verschillen D & H",
      "Lijst 1 - Vurige Vleugels Partij",
      "Lijst 2 - Wijzen van Water en Wind",
    ]);
  });

  test("renders with empty structure", () => {
    renderNavigation(mockValidationResultsWithErrors, "first_entry_has_errors", []);

    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  test("shows correct icons status based on validation results", () => {
    renderNavigation(mockValidationResultsWithErrors, "first_entry_has_errors");

    const investigationItem = screen.getByRole("link", { name: "Extra onderzoek" }).closest("li")!;
    expect(within(investigationItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(investigationItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const countingDiffItem = screen.getByRole("link", { name: "Verschillen met stembureau" }).closest("li")!;
    expect(within(countingDiffItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(countingDiffItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const votersAndVotesItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li")!;
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(within(votersAndVotesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const differencesItem = screen.getByRole("link", { name: "Verschillen D & H" }).closest("li")!;
    expect(within(differencesItem).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(differencesItem).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup1Item = screen.getByRole("link", { name: /Lijst 1 - Vurige Vleugels Partij/ }).closest("li")!;
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(within(politicalGroup1Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();

    const politicalGroup2Item = screen.getByRole("link", { name: /Lijst 2 - Wijzen van Water en Wind/ }).closest("li")!;
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(within(politicalGroup2Item).queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("show errors and warnings overview link when resolving errors ", () => {
    renderNavigation(mockValidationResultsWithErrors, "first_entry_has_errors");
    const firstItem = screen.getAllByRole("link")[0]!;
    expect(firstItem.textContent).toEqual("Fouten en waarschuwingen");
  });

  test("show warnings overview link when viewing data entry details with warnings", () => {
    renderNavigation(mockValidationResultsWithWarnings, "first_entry_finalised");
    const firstItem = screen.getAllByRole("link")[0]!;
    expect(firstItem.textContent).toEqual("Waarschuwingen");
  });

  test("do not show errors or warnings overview section when there are none", () => {
    renderNavigation(mockValidationResultsNoErrors, "first_entry_finalised");
    const firstItem = screen.getAllByRole("link")[0]!;
    expect(firstItem.textContent).toEqual("Extra onderzoek");
  });

  test("shows no icons when there are no validation results", () => {
    renderNavigation(mockValidationResultsNoErrors, "first_entry_finalised");

    expect(screen.queryByRole("img", { name: "bevat een fout" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "bevat een waarschuwing" })).not.toBeInTheDocument();
  });

  test("shows overview link as active when sectionId param is null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: undefined,
    });

    renderNavigation(mockValidationResultsWithErrors, "first_entry_has_errors");

    const overviewItem = screen.getByRole("link", { name: "Fouten en waarschuwingen" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "step");
  });

  test("shows section link as active when sectionId param is not null", () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({
      electionId: "1",
      pollingStationId: "5",
      sectionId: "voters_votes_counts",
    });

    renderNavigation(mockValidationResultsWithWarnings, "first_entry_finalised");

    const activeItem = screen.getByRole("link", { name: "Aantal kiezers en stemmen" }).closest("li");
    expect(activeItem).toHaveAttribute("aria-current", "step");

    const overviewItem = screen.getByRole("link", { name: "Waarschuwingen" }).closest("li");
    expect(overviewItem).toHaveAttribute("aria-current", "false");
  });

  test("uses correct links", () => {
    renderNavigation(mockValidationResultsWithWarnings, "first_entry_finalised");

    const overviewLink = screen.getByRole("link", { name: "Waarschuwingen" });
    expect(overviewLink).toHaveAttribute("href", "/elections/1/status/5/detail");

    const kiezersLink = screen.getByRole("link", { name: "Aantal kiezers en stemmen" });
    expect(kiezersLink).toHaveAttribute("href", "/elections/1/status/5/detail/voters_votes_counts");
  });
});
