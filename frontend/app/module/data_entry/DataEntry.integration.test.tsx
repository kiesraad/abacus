import { RouterProvider } from "react-router";

import { render as rtlRender, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { errorWarningMocks } from "@/component/form/data_entry/test-data";
import { routes } from "@/routes";

import { SaveDataEntryResponse, TestUserProvider } from "@kiesraad/api";
import {
  ElectionListRequestHandler,
  electionMockData,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { overrideOnce, Router, screen, server, setupTestRouter, userTypeInputs, waitFor } from "@kiesraad/test";

function renderWithRouter() {
  const router = setupTestRouter(routes);

  rtlRender(
    <TestUserProvider userRole="typist">
      <RouterProvider router={router} />
    </TestUserProvider>,
  );

  return router;
}

const user = userEvent.setup();

async function submit() {
  await user.click(screen.getByRole("button", { name: "Volgende" }));
}

async function startPollingStationInput(router: Router) {
  await router.navigate("/elections/1/data-entry/1/1");
  expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/1");
}

async function expectRecountedForm(inputShouldHaveFocus = true) {
  await waitFor(() => {
    expect(screen.getByTestId("recounted_form")).toBeInTheDocument();
  });
  if (inputShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByTestId("yes")).toHaveFocus();
    });
  }
}

async function fillRecountedFormNo() {
  await user.click(await screen.findByLabelText("Nee, er was geen hertelling"));
  await waitFor(() => {
    expect(screen.getByLabelText("Nee, er was geen hertelling")).toBeChecked();
  });
}

async function fillRecountedFormYes() {
  await user.click(await screen.findByLabelText("Ja, er was een hertelling"));
  await waitFor(() => {
    expect(screen.getByLabelText("Ja, er was een hertelling")).toBeChecked();
  });
}

async function expectVotersAndVotesForm(inputShouldHaveFocus = true) {
  await waitFor(() => {
    expect(screen.getByTestId("voters_and_votes_form")).toBeInTheDocument();
  });
  if (inputShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "A Stempassen" })).toHaveFocus();
    });
  }
}

const total_votes = electionMockData.political_groups.length * 10;

async function fillVotersAndVotesForm(values?: Record<string, number>) {
  const userValues = values ?? {
    "data.voters_counts.poll_card_count": total_votes,
    "data.voters_counts.proxy_certificate_count": 0,
    "data.voters_counts.voter_card_count": 0,
    "data.voters_counts.total_admitted_voters_count": total_votes,
    "data.votes_counts.votes_candidates_count": total_votes,
    "data.votes_counts.blank_votes_count": 0,
    "data.votes_counts.invalid_votes_count": 0,
    "data.votes_counts.total_votes_cast_count": total_votes,
  };

  await userTypeInputs(user, userValues);
}

async function expectDifferencesForm(inputShouldHaveFocus = true) {
  await waitFor(() => {
    expect(screen.getByTestId("differences_form")).toBeInTheDocument();
  });
  if (inputShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "I Stembiljetten méér geteld" })).toHaveFocus();
    });
  }
}

async function fillDifferencesForm(values?: Record<string, number>) {
  const userValues = values ?? {
    "data.differences_counts.more_ballots_count": 0,
    "data.differences_counts.fewer_ballots_count": 0,
    "data.differences_counts.unreturned_ballots_count": 0,
    "data.differences_counts.too_few_ballots_handed_out_count": 0,
    "data.differences_counts.too_many_ballots_handed_out_count": 0,
    "data.differences_counts.other_explanation_count": 0,
    "data.differences_counts.no_explanation_count": 0,
  };

  await userTypeInputs(user, userValues);
}

async function expectPoliticalGroupCandidatesForm(pgNumber: number, inputShouldHaveFocus = true) {
  const prefix = `data.political_group_votes[${pgNumber - 1}]`;
  await waitFor(() => {
    expect(screen.getByTestId(`candidates_form_${pgNumber}`)).toBeInTheDocument();
  });
  if (inputShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByTestId(`${prefix}.candidate_votes[0].votes`)).toHaveFocus();
    });
  }
}

async function fillPoliticalGroupCandidatesVotesForm(pgNumber: number) {
  const prefix = `data.political_group_votes[${pgNumber - 1}].`;
  await userTypeInputs(
    user,
    {
      "candidate_votes[0].votes": 5,
      "candidate_votes[1].votes": 5,
      total: 10,
    },
    prefix,
  );
}

async function expectCheckAndSavePage(router: Router, bodyShouldHaveFocus = true) {
  await waitFor(() => {
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/1/save");
  });
  if (bodyShouldHaveFocus) {
    await waitFor(() => {
      expect(document.body).toHaveFocus();
    });
  }
}

async function expectFeedbackError(code: string) {
  const error = screen.getByTestId("feedback-error");
  await waitFor(() => {
    expect(error).toBeInTheDocument();
  });
  if (code) {
    expect(within(error).getByText(code)).toBeInTheDocument();
  }
  await waitFor(() => {
    expect(within(error).getByRole("heading", { level: 3 })).toHaveFocus();
  });
}

async function expectFeedbackWarning(code: string) {
  const warning = screen.getByTestId("feedback-warning");
  await waitFor(() => {
    expect(warning).toBeInTheDocument();
  });
  if (code) {
    expect(within(warning).getByText(code)).toBeInTheDocument();
  }
  await waitFor(() => {
    expect(within(warning).getByRole("heading", { level: 3 })).toHaveFocus();
  });
}

async function acceptWarnings() {
  await user.click(screen.getByLabelText("Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."));
  expect(
    screen.getByLabelText("Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."),
  ).toBeChecked();
}

async function expectBlockerModal() {
  expect(await screen.findByTestId("modal-title")).toHaveFocus();
  expect(await screen.findByTestId("modal-title")).toHaveTextContent("Let op: niet opgeslagen wijzigingen");
}

async function expectElementContainsIcon(id: string, ariaLabel: string) {
  const el = await screen.findByTestId(id);
  expect(el).toBeInTheDocument();
  expect(within(el).getByRole("img")).toHaveAccessibleName(ariaLabel);
}

async function abortDataEntry() {
  await user.click(screen.getByRole("button", { name: "Invoer afbreken" }));
}

async function abortSaveChanges() {
  await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));
}

async function abortDelete() {
  await user.click(screen.getByRole("button", { name: "Niet bewaren" }));
}

async function expectPollingStationChoicePage(router: Router) {
  await waitFor(() => {
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");
  });
  await waitFor(() => {
    expect(screen.getByTestId("polling-station-choice-form")).toBeInTheDocument();
  });
}

async function submitWith422Response() {
  overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
    error: "JSON error or invalid data (Unprocessable Content)",
    fatal: false,
    reference: "InvalidJson",
  });
  await submit();
}

async function expect422ClientError() {
  const feedbackServerError = await screen.findByTestId("error-modal");
  expect(feedbackServerError).toHaveTextContent("De JSON is niet geldig");
}

async function submitWith500Response() {
  overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
    error: "Internal server error",
    fatal: false,
    reference: "InternalServerError",
  });
  await submit();
}

async function expect500ServerError() {
  const feedbackServerError = await screen.findByTestId("error-modal");
  expect(feedbackServerError).toHaveTextContent("Er is een interne fout opgetreden");
}

type FormIdentifier = "recounted" | "voters_and_votes" | "differences" | `candidates_${number}`;

async function gotoForm(id: FormIdentifier, inputShouldHaveFocus = true) {
  if (id.startsWith("candidates_")) {
    const bits = id.split("_");
    if (bits.length === 2 && bits[1]) {
      const pgNumber = parseInt(bits[1]);
      await user.click(screen.getByRole("link", { name: `Lijst ${pgNumber}` }));
      await expectPoliticalGroupCandidatesForm(pgNumber, inputShouldHaveFocus);
      return;
    }
  }
  switch (id) {
    case "recounted":
      await user.click(screen.getByRole("link", { name: "Is er herteld?" }));
      await expectRecountedForm(inputShouldHaveFocus);
      break;
    case "voters_and_votes":
      await user.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm(inputShouldHaveFocus);
      break;
    case "differences":
      await user.click(screen.getByRole("link", { name: "Verschillen" }));
      await expectDifferencesForm(inputShouldHaveFocus);
      break;
  }
}

// Steps to fill up to the 'voters and votes' form, submit, and leave pending changes
async function executeStepsForPendingChanges(router: Router) {
  await startPollingStationInput(router);
  await expectRecountedForm();
  await fillRecountedFormNo();
  await submit();
  await expectVotersAndVotesForm();
  await fillVotersAndVotesForm();
  await submit();
  await expectDifferencesForm();
  await gotoForm("voters_and_votes");
  await expectVotersAndVotesForm();
  await fillVotersAndVotesForm({
    "data.voters_counts.poll_card_count": 1,
    "data.voters_counts.proxy_certificate_count": 1,
    "data.voters_counts.voter_card_count": 1,
    "data.voters_counts.total_admitted_voters_count": 2,
    "data.votes_counts.votes_candidates_count": 1,
    "data.votes_counts.blank_votes_count": 1,
    "data.votes_counts.invalid_votes_count": 1,
    "data.votes_counts.total_votes_cast_count": 3,
  });

  overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
    validation_results: { errors: [errorWarningMocks.F201], warnings: [] },
  } as SaveDataEntryResponse);
  await submit();
  await expectFeedbackError("F.201");
  await fillVotersAndVotesForm({
    "data.voters_counts.total_admitted_voters_count": 3,
  });
}

describe("Polling Station data entry integration tests", () => {
  beforeEach(() => {
    server.use(
      ElectionListRequestHandler,
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      PollingStationDataEntryClaimHandler,
      PollingStationDataEntrySaveHandler,
      PollingStationDataEntryDeleteHandler,
    );
  });
  describe("Navigation through the form", () => {
    test("Fill in complete form", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();
      for (const pg of electionMockData.political_groups) {
        await expectPoliticalGroupCandidatesForm(pg.number);
        await fillPoliticalGroupCandidatesVotesForm(pg.number);
        await submit();
      }
      await expectCheckAndSavePage(router);
    });

    test("Error F204 navigates back to voters and votes page", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm({
        "data.voters_counts.poll_card_count": total_votes,
        "data.voters_counts.proxy_certificate_count": 1,
        "data.voters_counts.voter_card_count": 0,
        "data.voters_counts.total_admitted_voters_count": total_votes + 1,
        // to get the F204 error, votes_candidates_count should not match total_votes
        "data.votes_counts.votes_candidates_count": total_votes + 1,
        "data.votes_counts.blank_votes_count": 0,
        "data.votes_counts.invalid_votes_count": 0,
        "data.votes_counts.total_votes_cast_count": total_votes + 1,
      });
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();

      const lastGroup = electionMockData.political_groups[electionMockData.political_groups.length - 1];
      for (const group of electionMockData.political_groups) {
        await expectPoliticalGroupCandidatesForm(group.number);
        await fillPoliticalGroupCandidatesVotesForm(group.number);

        if (group === lastGroup) {
          overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
            validation_results: { errors: [errorWarningMocks.F204], warnings: [] },
          } as SaveDataEntryResponse);
        }
        await submit();
      }
      await expectVotersAndVotesForm(false);
      await expectFeedbackError("F.204");
    });

    test("Navigate back", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();
      await user.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm();
    });

    test("Navigate back with dirty state", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await user.click(screen.getByRole("link", { name: "Is er herteld?" }));
      await expectRecountedForm();
    });

    test("Navigate to next page after navigating back one page submitting", async () => {
      // https://github.com/kiesraad/abacus/issues/426
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await user.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
    });

    test("Navigate to next page after navigating back two pages and submitting", async () => {
      const router = renderWithRouter();

      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();
      await user.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
    });

    test("Navigating with changes triggers changes modal", async () => {
      const router = renderWithRouter();
      await executeStepsForPendingChanges(router);
      await user.click(screen.getByRole("link", { name: "Verschillen" }));
      await expectBlockerModal();
    });

    test("Navigating with saved changes goes to correct form", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();
      for (const pg of electionMockData.political_groups) {
        await expectPoliticalGroupCandidatesForm(pg.number);
        await fillPoliticalGroupCandidatesVotesForm(pg.number);
        await submit();
      }
      await expectCheckAndSavePage(router);

      await gotoForm("voters_and_votes");
      await userTypeInputs(user, {
        "data.voters_counts.total_admitted_voters_count": 1,
      });

      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [errorWarningMocks.F201], warnings: [] },
      } as SaveDataEntryResponse);
      await submit();
      await expectFeedbackError("F.201");

      await userTypeInputs(user, {
        "data.voters_counts.total_admitted_voters_count": total_votes,
      });

      await user.click(screen.getByRole("link", { name: "Is er herteld?" }));
      await expectBlockerModal();

      await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));
      await expectRecountedForm();
    });

    test("Changing recount generates an error for differences page", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await fillDifferencesForm();
      await submit();
      for (const pg of electionMockData.political_groups) {
        await expectPoliticalGroupCandidatesForm(pg.number);
        await fillPoliticalGroupCandidatesVotesForm(pg.number);
        await submit();
      }
      await expectCheckAndSavePage(router);
      await expectElementContainsIcon("list-item-save", "je bent hier");
      await gotoForm("recounted");
      await expectElementContainsIcon("list-item-save", "nog niet afgerond");
      await fillRecountedFormYes();
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [errorWarningMocks.F301], warnings: [] },
      } as SaveDataEntryResponse);
      await submit();
      await expectVotersAndVotesForm();
      await expectElementContainsIcon("list-item-differences", "bevat een fout");
    });

    test("Progress list shows correct icons", async () => {
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();

      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();

      await expectDifferencesForm();
      await gotoForm("voters_and_votes");
      await expectElementContainsIcon("list-item-differences", "nog niet afgerond");
      await gotoForm("differences");
      await fillDifferencesForm();
      await submit();

      for (const pg of electionMockData.political_groups) {
        await expectPoliticalGroupCandidatesForm(pg.number);
        await fillPoliticalGroupCandidatesVotesForm(pg.number);
        await submit();
      }

      await expectCheckAndSavePage(router);
      await expectElementContainsIcon("list-item-recounted", "opgeslagen");
      await expectElementContainsIcon("list-item-differences", "leeg");
      await gotoForm("voters_and_votes");
      await expectElementContainsIcon("list-item-voters-and-votes", "je bent hier");
      await fillVotersAndVotesForm({
        "data.voters_counts.poll_card_count": total_votes + 1,
        "data.voters_counts.total_admitted_voters_count": total_votes + 1,
        "data.votes_counts.votes_candidates_count": total_votes,
        "data.votes_counts.total_votes_cast_count": total_votes,
      });
      await submit();
      await expectDifferencesForm(false);
      await fillDifferencesForm({
        "data.differences_counts.fewer_ballots_count": 1,
        "data.differences_counts.no_explanation_count": 2,
      });
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [errorWarningMocks.W302] },
      } as SaveDataEntryResponse);
      await submit();
      await expectFeedbackWarning("W.302");
      await acceptWarnings();
      await submit();
      await expectPoliticalGroupCandidatesForm(1);
      await expectElementContainsIcon("list-item-differences", "opgeslagen");
      await gotoForm("voters_and_votes");
      await userTypeInputs(user, {
        "data.voters_counts.total_admitted_voters_count": 1,
      });
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [errorWarningMocks.F201], warnings: [] },
      } as SaveDataEntryResponse);
      await submit();
      await expectVotersAndVotesForm(false);
      await expectFeedbackError("F.201");
      await gotoForm("differences", false);
      await expectElementContainsIcon("list-item-voters-and-votes", "bevat een fout");
    });
  });

  describe("Aborting data entry", () => {
    test("Aborting and save with pending changes is possible", async () => {
      const router = renderWithRouter();
      await executeStepsForPendingChanges(router);
      await abortDataEntry();
      await abortSaveChanges();
      await expectPollingStationChoicePage(router);
    });

    test("Abort and delete with pending changes is possible", async () => {
      const router = renderWithRouter();
      await executeStepsForPendingChanges(router);
      await abortDataEntry();
      await abortDelete();
      await expectPollingStationChoicePage(router);
    });
  });

  describe("API error responses", () => {
    test("4xx response results in error shown", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submitWith422Response();
      await expect422ClientError();
    });

    test("5xx response results in error shown", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = renderWithRouter();
      await startPollingStationInput(router);
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submitWith500Response();
      await expect500ServerError();
    });
  });
});
