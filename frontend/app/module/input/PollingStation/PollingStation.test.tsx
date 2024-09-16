import { render as rtlRender, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { overrideOnce, Providers, screen, setupTestRouter, userTypeInputs, waitFor } from "app/test/unit";

import { electionMockData } from "@kiesraad/api-mocks";

const router = setupTestRouter();
const render = () => rtlRender(<Providers router={router} />);

const user = userEvent.setup();

const submit = async () => {
  await user.click(screen.getByRole("button", { name: "Volgende" }));
};

const startPollingStationInput = async () => {
  await router.navigate("/1/input/1");
  expect(router.state.location.pathname).toEqual("/1/input/1");
};

const expectRecountedForm = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("recounted_form")).toBeInTheDocument();
  });
};

const fillRecountedFormNo = async () => {
  await user.click(screen.getByLabelText("Nee, er was geen hertelling"));
};

const fillRecountedFormYes = async () => {
  await user.click(screen.getByLabelText("Ja, er was een hertelling"));
};

const expectVotersAndVotesForm = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("voters_and_votes_form")).toBeInTheDocument();
  });
};

const total_votes = electionMockData.political_groups.length * 10;

const fillVotersAndVotesForm = async (values?: Record<string, number>) => {
  const userValues = values ?? {
    poll_card_count: total_votes,
    proxy_certificate_count: 0,
    voter_card_count: 0,
    total_admitted_voters_count: total_votes,
    votes_candidates_count: total_votes,
    blank_votes_count: 0,
    invalid_votes_count: 0,
    total_votes_cast_count: total_votes,
  };

  await userTypeInputs(user, userValues);
};

const expectDifferencesForm = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("differences_form")).toBeInTheDocument();
  });
};

const fillDifferencesForm = async (values?: Record<string, number>) => {
  const userValues = values ?? {
    more_ballots_count: 0,
    fewer_ballots_count: 0,
    unreturned_ballots_count: 0,
    too_few_ballots_handed_out_count: 0,
    too_many_ballots_handed_out_count: 0,
    other_explanation_count: 0,
    no_explanation_count: 0,
  };

  await userTypeInputs(user, userValues);
};

const expectPoliticalGroupCandidatesForm = async (pgNumber: number) => {
  await waitFor(() => {
    expect(screen.getByTestId(`candidates_form_${pgNumber}`)).toBeInTheDocument();
  });
};

const fillPoliticalGroupCandidatesVotesForm = async () => {
  await userTypeInputs(user, {
    "candidate_votes[0].votes": 5,
    "candidate_votes[1].votes": 5,
    total: 10,
  });
};

const expectCheckAndSavePage = async () => {
  await waitFor(() => {
    expect(router.state.location.pathname).toEqual("/1/input/1/save");
  });
};

const expectFeedbackError = async (code?: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("feedback-error")).toBeInTheDocument();
  });
  if (code) {
    expect(screen.getByText(code)).toBeInTheDocument();
  }
};

const expectFeedbackWarning = async (code?: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("feedback-warning")).toBeInTheDocument();
  });
  if (code) {
    expect(screen.getByText(code)).toBeInTheDocument();
  }
};

const acceptWarning = async () => {
  await user.click(screen.getByTestId("differences_form_ignore_warnings"));
  expect(screen.getByTestId("differences_form_ignore_warnings")).toBeChecked();
};

const expectBlockerModal = async () => {
  expect(await screen.findByTestId("modal-blocker-title")).toHaveTextContent("Let op: niet opgeslagen wijzigingen");
};

const expectElementContainsIcon = async (id: string, ariaLabel: string) => {
  const el = await screen.findByTestId(id);
  expect(el).toBeInTheDocument();
  expect(within(el).getByRole("img")).toHaveAccessibleName(ariaLabel);
};

const abortDataEntry = async () => {
  await user.click(screen.getByRole("button", { name: "Invoer afbreken" }));
};

const abortSaveChanges = async () => {
  await user.click(screen.getByRole("button", { name: "Invoer bewaren" }));
};

const abortDelete = async () => {
  await user.click(screen.getByRole("button", { name: "Niet bewaren" }));
};

const expectPollingStationChoicePage = async () => {
  await waitFor(() => {
    expect(router.state.location.pathname).toEqual("/1/input");
  });
  await waitFor(() => {
    expect(screen.getByTestId("polling-station-choice-form")).toBeInTheDocument();
  });
};

const submitWith422Response = async () => {
  overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
    error: "JSON error or invalid data (Unprocessable Content)",
  });
  await submit();
};

const expect422ClientError = async () => {
  const feedbackServerError = await screen.findByTestId("feedback-server-error");
  expect(feedbackServerError).toHaveTextContent(
    "Sorry, er ging iets mis422: JSON error or invalid data (Unprocessable Content)",
  );
};

const submitWith500Response = async () => {
  overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
    error: "Internal server error",
  });
  await submit();
};

const expect500ServerError = async () => {
  const feedbackServerError = await screen.findByTestId("feedback-server-error");
  expect(feedbackServerError).toHaveTextContent("Sorry, er ging iets mis500: Internal server error");
};

type FormIdentifier = "recounted" | "voters_and_votes" | "differences" | `candidates_${number}`;

const gotoForm = async (id: FormIdentifier) => {
  if (id.startsWith("candidates_")) {
    const bits = id.split("_");
    if (bits.length === 2 && bits[1]) {
      const pgNumber = parseInt(bits[1]);
      await userEvent.click(screen.getByRole("link", { name: `Lijst ${pgNumber}` }));
      await expectPoliticalGroupCandidatesForm(pgNumber);
      return;
    }
  }
  switch (id) {
    case "recounted":
      await userEvent.click(screen.getByRole("link", { name: "Is er herteld?" }));
      await expectRecountedForm();
      break;
    case "voters_and_votes":
      await userEvent.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm();
      break;
    case "differences":
      await userEvent.click(screen.getByRole("link", { name: "Verschillen" }));
      await expectDifferencesForm();
      break;
  }
};

// Steps to fill up to the 'voters and votes' form, submit, and leave pending changes
const stepsForPendingChanges = [
  startPollingStationInput,
  expectRecountedForm,
  fillRecountedFormNo,
  submit,
  expectVotersAndVotesForm,
  fillVotersAndVotesForm,
  submit,
  expectDifferencesForm,
  () => gotoForm("voters_and_votes"),
  expectVotersAndVotesForm,
  () =>
    fillVotersAndVotesForm({
      poll_card_count: 1,
      proxy_certificate_count: 1,
      voter_card_count: 1,
      total_admitted_voters_count: 2,
      votes_candidates_count: 1,
      blank_votes_count: 1,
      invalid_votes_count: 1,
      total_votes_cast_count: 3,
    }),
  submit,
  expectFeedbackError,
  () =>
    fillVotersAndVotesForm({
      total_admitted_voters_count: 3,
    }),
];

describe("Polling Station data entry integration tests", () => {
  describe("Navigation throught the form", () => {
    test("Fill in complete form", async () => {
      render();

      const formFillingSteps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        ...electionMockData.political_groups.flatMap((pg) => [
          () => expectPoliticalGroupCandidatesForm(pg.number),
          fillPoliticalGroupCandidatesVotesForm,
          submit,
        ]),
        expectCheckAndSavePage,
      ];

      for (const step of formFillingSteps) {
        await step();
      }
    });

    test("Error F204 navigates back to voters and votes page", async () => {
      render();

      const formFillingSteps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        () =>
          fillVotersAndVotesForm({
            poll_card_count: total_votes,
            proxy_certificate_count: 1,
            voter_card_count: 0,
            total_admitted_voters_count: total_votes + 1,
            // to get the F204 error, votes_candidates_count should not match total_votes
            votes_candidates_count: total_votes + 1,
            blank_votes_count: 0,
            invalid_votes_count: 0,
            total_votes_cast_count: total_votes + 1,
          }),
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        ...electionMockData.political_groups.flatMap((pg) => [
          () => expectPoliticalGroupCandidatesForm(pg.number),
          fillPoliticalGroupCandidatesVotesForm,
          submit,
        ]),
        expectVotersAndVotesForm,
        () => expectFeedbackError("F.204"),
      ];

      for (const step of formFillingSteps) {
        await step();
      }
    });

    test("Navigate back", async () => {
      render();

      const steps = [
        // fill up to and including the differences form
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        // navigate back to the 'voters and votes' form
        () => userEvent.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" })),
        expectVotersAndVotesForm,
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Navigate back with dirty state", async () => {
      render();

      const steps = [
        // fill up to and including the voters and votes form
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        // don't submit, and navigate back to the 'recounted' form
        () => userEvent.click(screen.getByRole("link", { name: "Is er herteld?" })),
        expectRecountedForm,
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Navigate to next page after navigating back and submitting", async () => {
      render();

      const steps = [
        // fill up to and including the differences form
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        // navigate back to the 'voters and votes' form and submit
        () => userEvent.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" })),
        expectVotersAndVotesForm,
        submit,
        // expect to be on the 'differences' form
        expectDifferencesForm,
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Navigating with changes triggers changes modal", async () => {
      render();

      const steps = [
        ...stepsForPendingChanges,
        () => userEvent.click(screen.getByRole("link", { name: "Verschillen" })),
        expectBlockerModal,
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Navigating with saved changes goes to correct form", async () => {
      render();

      const steps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        ...electionMockData.political_groups.flatMap((pg) => [
          () => expectPoliticalGroupCandidatesForm(pg.number),
          fillPoliticalGroupCandidatesVotesForm,
          submit,
        ]),
        expectCheckAndSavePage,

        () => gotoForm("voters_and_votes"),
        () =>
          userTypeInputs(user, {
            total_admitted_voters_count: 1,
          }),
        submit,
        expectFeedbackError,
        () =>
          userTypeInputs(user, {
            total_admitted_voters_count: total_votes,
          }),
        () => userEvent.click(screen.getByRole("link", { name: "Is er herteld?" })),
        expectBlockerModal,
        () => user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" })),
        expectRecountedForm,
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Changing recount generates an error for differences page", async () => {
      render();

      const steps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        fillDifferencesForm,
        submit,
        ...electionMockData.political_groups.flatMap((pg) => [
          () => expectPoliticalGroupCandidatesForm(pg.number),
          fillPoliticalGroupCandidatesVotesForm,
          submit,
        ]),
        expectCheckAndSavePage,
        () => gotoForm("recounted"),
        fillRecountedFormYes,
        submit,
        expectVotersAndVotesForm,
        () => expectElementContainsIcon("list-item-differences", "bevat een fout"),
      ];

      for (const step of steps) {
        await step();
      }
    });

    test("Progress list shows correct icons", async () => {
      render();

      const steps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submit,
        expectVotersAndVotesForm,
        fillVotersAndVotesForm,
        submit,
        expectDifferencesForm,
        () => gotoForm("voters_and_votes"),
        () => expectElementContainsIcon("list-item-differences", "nog niet afgerond"),

        () => gotoForm("differences"),
        fillDifferencesForm,
        submit,
        ...electionMockData.political_groups.flatMap((pg) => [
          () => expectPoliticalGroupCandidatesForm(pg.number),
          fillPoliticalGroupCandidatesVotesForm,
          submit,
        ]),
        expectCheckAndSavePage,
        () => expectElementContainsIcon("list-item-recounted", "opgeslagen"),
        () => expectElementContainsIcon("list-item-differences", "leeg"),

        () => gotoForm("voters_and_votes"),
        () => expectElementContainsIcon("list-item-numbers", "je bent hier"),
        () =>
          fillVotersAndVotesForm({
            poll_card_count: total_votes + 1,
            total_admitted_voters_count: total_votes + 1,
            votes_candidates_count: total_votes,
            total_votes_cast_count: total_votes,
          }),
        submit,
        expectDifferencesForm,
        () => fillDifferencesForm({ fewer_ballots_count: 1, no_explanation_count: 2 }),
        submit,
        () => expectFeedbackWarning("W.302"),
        acceptWarning,
        submit,

        () => expectPoliticalGroupCandidatesForm(1),
        () => expectElementContainsIcon("list-item-differences", "bevat een waarschuwing"),

        () => gotoForm("voters_and_votes"),
        () =>
          userTypeInputs(user, {
            total_admitted_voters_count: 1,
          }),
        submit,
        expectVotersAndVotesForm,

        () => gotoForm("differences"),
        () => expectElementContainsIcon("list-item-numbers", "bevat een fout"),
      ];

      for (const step of steps) {
        await step();
      }
    });
  });

  describe("Aborting data entry", () => {
    test("Aborting and save with pending changes is possible", async () => {
      render();

      const steps = [...stepsForPendingChanges, abortDataEntry, abortSaveChanges, expectPollingStationChoicePage];

      for (const step of steps) {
        await step();
      }
    });

    test("Abort and delete with pending changes is possible", async () => {
      render();

      const steps = [...stepsForPendingChanges, abortDataEntry, abortDelete, expectPollingStationChoicePage];

      for (const step of steps) {
        await step();
      }
    });
  });

  describe("API error responses", () => {
    test("4xx response results in error shown", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      render();

      const formFillingSteps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submitWith422Response,
        expect422ClientError,
      ];

      for (const step of formFillingSteps) {
        await step();
      }
    });

    test("5xx response results in error shown", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      render();

      const formFillingSteps = [
        startPollingStationInput,
        expectRecountedForm,
        fillRecountedFormNo,
        submitWith500Response,
        expect500ServerError,
      ];

      for (const step of formFillingSteps) {
        await step();
      }
    });
  });
});
