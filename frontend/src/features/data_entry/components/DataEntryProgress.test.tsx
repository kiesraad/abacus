import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { server } from "@/testing/server";
import { render, screen, waitFor, within } from "@/testing/test-utils";
import { ValidationResultSet } from "@/utils/ValidationResults";

import { getDefaultFormSection } from "../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../testing/test.utils";
import { FormState } from "../types/types";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";

function renderForm() {
  return render(
    <ElectionProvider electionId={1}>
      <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
        <DataEntryProgress />
      </DataEntryProvider>
    </ElectionProvider>,
  );
}

function getDefaultFormState(): FormState {
  return {
    furthest: "save",
    sections: {
      voters_votes_counts: getDefaultFormSection("voters_votes_counts", 1),
      differences_counts: getDefaultFormSection("differences_counts", 2),
      political_group_votes_1: getDefaultFormSection("political_group_votes_1", 3),
      political_group_votes_2: getDefaultFormSection("political_group_votes_2", 4),
      save: getDefaultFormSection("save", 5),
    },
  };
}

const pollingStationResults = {
  differences_counts: {
    more_ballots_count: 5,
    fewer_ballots_count: 0,
    compare_votes_cast_admitted_voters: {
      admitted_voters_equal_votes_cast: false,
      votes_cast_greater_than_admitted_voters: false,
      votes_cast_smaller_than_admitted_voters: false,
    },
    difference_completely_accounted_for: { yes: false, no: false },
  },
  political_group_votes: [
    {
      number: 1,
      total: 0,
      candidate_votes: Array.from({ length: 29 }, (_, i) => ({ number: i, votes: 0 })),
    },
    {
      number: 2,
      total: 10,
      candidate_votes: [{ number: 1, votes: 10 }],
    },
  ],
};

describe("DataEntryProgress", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
  });

  test("shows different states for entries", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1", sectionId: "political_group_votes_2" });
    const formState = getDefaultFormState();

    formState.furthest = "political_group_votes_2";
    formState.sections.voters_votes_counts!.acceptErrorsAndWarnings = false;
    formState.sections.differences_counts!.acceptErrorsAndWarnings = true;

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: pollingStationResults,
      continueToNextSection: false,
      validationResults: {
        errors: [validationResultMockData.F201],
        warnings: [validationResultMockData.W201, validationResultMockData.W301],
      },
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Aantal kiezers en stemmen")).toBeVisible();
    });

    const votersAndVotes = screen.getByTestId("list-item-voters_votes_counts");
    const differences = screen.getByTestId("list-item-differences_counts");
    const list1 = screen.getByTestId("list-item-political_group_votes_1");
    const list2 = screen.getByTestId("list-item-political_group_votes_2");
    const checkAndSave = screen.getByTestId("list-item-save");

    expect(votersAndVotes).toHaveClass("error");
    expect(votersAndVotes).toHaveAttribute("aria-current", "false");
    const votersAndVotesIcon = within(votersAndVotes).getByRole("img");
    expect(votersAndVotesIcon).toHaveAccessibleName("bevat een fout");

    expect(differences).toHaveClass("accept");
    expect(differences).toHaveAttribute("aria-current", "false");
    const differencesIcon = within(differences).getByRole("img");
    expect(differencesIcon).toHaveAccessibleName("opgeslagen");

    expect(list1).toHaveClass("empty");
    expect(list1).toHaveAttribute("aria-current", "false");
    const list1Icon = within(list1).getByRole("img");
    expect(list1Icon).toHaveAccessibleName("leeg");

    expect(list2).toHaveClass("active unsaved");
    expect(list2).toHaveAttribute("aria-current", "step");
    const list2Icon = within(list2).getByRole("img");
    expect(list2Icon).toHaveAccessibleName("je bent hier");

    expect(checkAndSave).toHaveClass("idle disabled");
    expect(checkAndSave).toHaveAttribute("aria-current", "false");
    expect(within(checkAndSave).queryByRole("img")).not.toBeInTheDocument();
  });

  test("Prioritise errors over warnings", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1", sectionId: "political_group_votes_2" });
    const formState = getDefaultFormState();

    formState.furthest = "political_group_votes_2";

    formState.sections.voters_votes_counts!.errors = new ValidationResultSet([validationResultMockData.F201]);
    formState.sections.voters_votes_counts!.warnings = new ValidationResultSet([validationResultMockData.W201]);

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: pollingStationResults,
      continueToNextSection: false,
      validationResults: {
        errors: [validationResultMockData.F201],
        warnings: [validationResultMockData.W201],
      },
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Aantal kiezers en stemmen")).toBeVisible();
    });

    const votersAndVotes = screen.getByTestId("list-item-voters_votes_counts");

    expect(votersAndVotes).toHaveClass("error");
    expect(votersAndVotes).toHaveAttribute("aria-current", "false");
    const votersAndVotesIcon = within(votersAndVotes).getByRole("img");
    expect(votersAndVotesIcon).toHaveAccessibleName("bevat een fout");
  });

  test("shows links to other pages when on last page", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1", sectionId: "save" });
    const formState = getDefaultFormState();

    formState.furthest = "save";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: pollingStationResults,
      continueToNextSection: false,
      validationResults: undefined,
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Aantal kiezers en stemmen")).toBeVisible();
    });

    const votersAndVotes = screen.getByTestId("list-item-voters_votes_counts");
    const differences = screen.getByTestId("list-item-differences_counts");
    const list1 = screen.getByTestId("list-item-political_group_votes_1");

    const electionId = 1;
    const pollingStationId = 1;
    const entryNumber = 1;

    const votersAndVotesLink = within(votersAndVotes).getByRole("link", { name: "Aantal kiezers en stemmen" });
    expect(votersAndVotesLink).toBeVisible();
    expect(votersAndVotesLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/voters_votes_counts`,
    );

    const differencesLink = within(differences).getByRole("link", { name: "Verschillen D & H" });
    expect(differencesLink).toBeVisible();
    expect(differencesLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/differences_counts`,
    );

    const list1Link = within(list1).getByRole("link", { name: "Lijst 1 - Vurige Vleugels Partij" });
    expect(list1Link).toBeVisible();
    expect(list1Link).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/political_group_votes_1`,
    );
  });

  test("shows links when navigating to earlier page", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1", sectionId: "political_group_votes_1" });
    const formState = getDefaultFormState();

    formState.furthest = "save";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: pollingStationResults,
      continueToNextSection: false,
      validationResults: undefined,
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Aantal kiezers en stemmen")).toBeVisible();
    });

    const list1 = screen.getByTestId("list-item-political_group_votes_1");
    const checkAndSave = screen.getByTestId("list-item-save");

    const electionId = 1;
    const pollingStationId = 1;
    const entryNumber = 1;

    expect(list1).toHaveClass("active empty");
    expect(list1).toHaveAttribute("aria-current", "step");
    const list1Icon = within(list1).getByRole("img");
    expect(list1Icon).toHaveAccessibleName("je bent hier");
    expect(within(list1).queryByRole("link", { name: "Lijst 1 - Vurige Vleugels Partij" })).not.toBeInTheDocument();

    expect(checkAndSave).toHaveClass("unsaved");
    expect(checkAndSave).toHaveAttribute("aria-current", "false");
    const checkAndSaveIcon = within(checkAndSave).getByRole("img");
    expect(checkAndSaveIcon).toHaveAccessibleName("nog niet afgerond");

    const checkAndSaveLink = within(checkAndSave).getByRole("link", { name: "Controleren en opslaan" });
    expect(checkAndSaveLink).toBeVisible();
    expect(checkAndSaveLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/save`,
    );
  });

  test("Mismatch between election data and formState", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1", sectionId: "differences_counts" });
    const formState = getDefaultFormState();
    delete formState.sections.political_group_votes_2;
    formState.sections.political_group_votes_3 = getDefaultFormSection("political_group_votes_3", 6);
    formState.sections.save = getDefaultFormSection("save", 7);
    formState.furthest = "differences_counts";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: pollingStationResults,
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Aantal kiezers en stemmen")).toBeVisible();
    });

    const list1 = screen.getByTestId("list-item-political_group_votes_1");
    expect(list1).toHaveClass("idle disabled");
    expect(list1).toHaveAttribute("aria-current", "false");

    const list2 = screen.getByTestId("list-item-political_group_votes_2");
    expect(list2).toHaveClass("idle disabled");
    expect(list2).toHaveAttribute("aria-current", "false");

    expect(screen.queryByTestId("list-item-pg-3")).not.toBeInTheDocument();
  });
});
