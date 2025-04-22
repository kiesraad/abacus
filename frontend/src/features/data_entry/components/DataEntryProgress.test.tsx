import { useParams } from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor, within } from "@/testing/test-utils";

import { errorWarningMocks, getDefaultFormSection } from "../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../testing/test.utils";
import { DataEntryState } from "../types/types";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";

// TODO: consider replacing the "idle" returned at the end of menuStatusForFormSection with something different than "idle".
//      It's for forms that have not been visited yet.
//      Reason: the active attribute can also set an "idle" class

// What needs testing?
// each item:
//   status: from menuStatusForFormSection() -> class and icon
//   disabled: depends on currentIndex -> class
//   active: depends on formState.current -> aria-current (step or false) and icon and class (active or idle)
//   link or not: depends on formState.current and currentIndex
// formState is the input for all of these
// results of status/disabled/active are covered (icon and aria-current) in ProgressList tests

// determining if empty requires pollingStationResults

// formsection variants (cascade down)
// missing => only for political group and does not reach menuStatusForFormSection()
// error
// unaccepted warning
// accepted warning
// furthest
// no furthest -> ever the case??
// empty and not furthest
// empty and beyond furthest
// no error and saved
// the rest
// // "accept" | "active" | "empty" | "error" | "idle" | "unsaved" | "warning";
// // active not a return value of this function

vi.mock("react-router");

function renderForm() {
  return render(
    <ElectionProvider electionId={1}>
      <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
        <DataEntryProgress />
      </DataEntryProvider>
    </ElectionProvider>,
  );
}

const defaultDataEntryState: DataEntryState = {
  // TODO: refactor similar function in defaultDataEntryState and use instead?
  election: electionMockData,
  pollingStationId: 1,
  error: null,
  pollingStationResults: null,
  entryNumber: 1,
  formState: {
    current: "differences_counts",
    furthest: "save",
    sections: {
      recounted: getDefaultFormSection("recounted", 1),
      voters_votes_counts: getDefaultFormSection("voters_votes_counts", 2),
      differences_counts: getDefaultFormSection("differences_counts", 3),
      political_group_votes_1: getDefaultFormSection("political_group_votes_1", 4),
      political_group_votes_2: getDefaultFormSection("political_group_votes_2", 5),
      save: getDefaultFormSection("save", 6),
    },
  },
  targetFormSectionId: "recounted", // TODO: should match with formState.current?
  status: "idle",
  cache: null,
};

describe("Test DataEntryProgress", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
    vi.mocked(useParams).mockReturnValue({ pollingStationId: "1" });
  });

  test("DataEntryProgress shows different states", async () => {
    const formState = defaultDataEntryState.formState;

    formState.current = "political_group_votes_2";
    formState.furthest = "political_group_votes_2";
    formState.sections.voters_votes_counts.acceptWarnings = false;
    formState.sections.differences_counts.acceptWarnings = true;

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: {
        recounted: false,
        differences_counts: {
          more_ballots_count: 5,
          fewer_ballots_count: 0,
          no_explanation_count: 0,
          other_explanation_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 0,
          unreturned_ballots_count: 0,
        },
        political_group_votes: [
          {
            number: 1,
            total: 0,
            candidate_votes: [
              // TODO different number of candidates than in mock data (29)
              { number: 1, votes: 0 },
            ],
          },
          {
            number: 2,
            total: 10,
            candidate_votes: [
              // TODO different number of candidates than in mock data (29)
              { number: 1, votes: 10 },
            ],
          },
        ],
      },
      continueToNextSection: false,
      validationResults: {
        errors: [errorWarningMocks.F101],
        warnings: [errorWarningMocks.W201, errorWarningMocks.W301],
      },
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Is er herteld?")).toBeVisible();
    });

    const recounted = screen.getByTestId("list-item-recounted");
    const votersAndVotes = screen.getByTestId("list-item-voters-and-votes");
    const differences = screen.getByTestId("list-item-differences");
    const list1 = screen.getByTestId("list-item-pg-1");
    const list2 = screen.getByTestId("list-item-pg-2");
    const checkAndSave = screen.getByTestId("list-item-save");

    // TODO: idle unsaved -> navigate back from furthest

    expect(recounted).toHaveClass("idle error");
    expect(recounted).toHaveAttribute("aria-current", "false");
    const recountedIcon = within(recounted).getByRole("img");
    expect(recountedIcon).toHaveAccessibleName("bevat een fout");

    expect(votersAndVotes).toHaveClass("idle warning");
    expect(votersAndVotes).toHaveAttribute("aria-current", "false");
    const votersAndVotesicon = within(votersAndVotes).getByRole("img");
    expect(votersAndVotesicon).toHaveAccessibleName("bevat een waarschuwing");

    expect(differences).toHaveClass("idle accept");
    expect(differences).toHaveAttribute("aria-current", "false");
    const differencesIcon = within(differences).getByRole("img");
    expect(differencesIcon).toHaveAccessibleName("opgeslagen");

    expect(list1).toHaveClass("idle empty");
    expect(list1).toHaveAttribute("aria-current", "false");
    const list1Icon = within(list1).getByRole("img");
    expect(list1Icon).toHaveAccessibleName("leeg");

    expect(list2).toHaveClass("active unsaved");
    expect(list2).toHaveAttribute("aria-current", "step");
    const list2Icon = within(list2).getByRole("img");
    expect(list2Icon).toHaveAccessibleName("je bent hier");

    expect(checkAndSave).toHaveClass("idle idle disabled");
    expect(checkAndSave).toHaveAttribute("aria-current", "false");
    expect(within(checkAndSave).queryByRole("img")).not.toBeInTheDocument();
  });

  test("DataEntryProgress shows links to other pages - current saved", async () => {
    const formState = defaultDataEntryState.formState;

    formState.current = "save";
    formState.furthest = "save";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: {},
      continueToNextSection: false,
      validationResults: undefined,
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Is er herteld?")).toBeVisible();
    });

    const recounted = screen.getByTestId("list-item-recounted");
    const votersAndVotes = screen.getByTestId("list-item-voters-and-votes");
    const differences = screen.getByTestId("list-item-differences");
    const list1 = screen.getByTestId("list-item-pg-1");

    const electionId = 1;
    const pollingStationId = 1;
    const entryNumber = 1;

    const recountedLink = within(recounted).getByRole("link", { name: "Is er herteld?" });
    expect(recountedLink).toBeVisible();
    expect(recountedLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/recounted`,
    );

    const votersAndVotesLink = within(votersAndVotes).getByRole("link", { name: "Aantal kiezers en stemmen" });
    expect(votersAndVotesLink).toBeVisible();
    expect(votersAndVotesLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/voters-and-votes`,
    );

    const differencesLink = within(differences).getByRole("link", { name: "Verschillen" });
    expect(differencesLink).toBeVisible();
    expect(differencesLink).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/differences`,
    );

    const list1Link = within(list1).getByRole("link", { name: "Lijst 1 - Vurige Vleugels Partij" });
    expect(list1Link).toBeVisible();
    expect(list1Link).toHaveAttribute(
      "href",
      `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}/list/1`,
    );
  });

  test("DataEntryProgress - navigate back from end", async () => {
    const formState = defaultDataEntryState.formState;

    formState.current = "political_group_votes_1";
    formState.furthest = "save";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: {
        recounted: false,
        differences_counts: {
          more_ballots_count: 5,
          fewer_ballots_count: 0,
          no_explanation_count: 0,
          other_explanation_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 0,
          unreturned_ballots_count: 0,
        },
        political_group_votes: [
          {
            number: 1,
            total: 0,
            candidate_votes: [
              // TODO different number of candidates than in mock data (29)
              { number: 1, votes: 0 },
            ],
          },
          {
            number: 2,
            total: 10,
            candidate_votes: [
              // TODO different number of candidates than in mock data (29)
              { number: 1, votes: 10 },
            ],
          },
        ],
      },
      continueToNextSection: false,
      validationResults: undefined,
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Is er herteld?")).toBeVisible();
    });

    const list1 = screen.getByTestId("list-item-pg-1");
    const checkAndSave = screen.getByTestId("list-item-save");

    const electionId = 1;
    const pollingStationId = 1;
    const entryNumber = 1;

    expect(list1).toHaveClass("active empty");
    expect(list1).toHaveAttribute("aria-current", "step");
    const list1Icon = within(list1).getByRole("img");
    expect(list1Icon).toHaveAccessibleName("je bent hier");

    expect(within(list1).queryByRole("link", { name: "Lijst 1 - Vurige Vleugels Partij" })).not.toBeInTheDocument();

    expect(checkAndSave).toHaveClass("idle unsaved");
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
    const formState = defaultDataEntryState.formState;
    delete formState.sections.political_group_votes_2;
    formState.sections.political_group_votes_3 = getDefaultFormSection("political_group_votes_3", 6);
    formState.sections.save = getDefaultFormSection("save", 7);
    formState.current = "differences_counts";
    formState.furthest = "differences_counts";

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: {
        recounted: true,
      },
    });
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Is er herteld?")).toBeVisible();
    });

    const list1 = screen.getByTestId("list-item-pg-1");
    expect(list1).toHaveClass("idle idle disabled");
    expect(list1).toHaveAttribute("aria-current", "false");

    const list2 = screen.getByTestId("list-item-pg-2");
    expect(list2).toHaveClass("idle idle disabled");
    expect(list2).toHaveAttribute("aria-current", "false");

    expect(screen.queryByTestId("list-item-pg-3")).not.toBeInTheDocument();
  });
});
