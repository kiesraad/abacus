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
  await router.navigate("/elections/1/data-entry/1");
  expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1");
};

const expectRecountedForm = async (headingShouldHaveFocus = true) => {
  await waitFor(() => {
    expect(screen.getByTestId("recounted_form")).toBeInTheDocument();
  });
  if (headingShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Is er herteld?" })).toHaveFocus();
    });
  }
};

const fillRecountedFormNo = async () => {
  await user.click(screen.getByLabelText("Nee, er was geen hertelling"));
  await waitFor(() => {
    expect(screen.getByLabelText("Nee, er was geen hertelling")).toBeChecked();
  });
};

const fillRecountedFormYes = async () => {
  await user.click(screen.getByLabelText("Ja, er was een hertelling"));
  await waitFor(() => {
    expect(screen.getByLabelText("Ja, er was een hertelling")).toBeChecked();
  });
};

const expectVotersAndVotesForm = async (headingShouldHaveFocus = true) => {
  await waitFor(() => {
    expect(screen.getByTestId("voters_and_votes_form")).toBeInTheDocument();
  });
  if (headingShouldHaveFocus) {
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Toegelaten kiezers en uitgebrachte stemmen" }),
      ).toHaveFocus();
    });
  }
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

const expectDifferencesForm = async (headingShouldHaveFocus = true) => {
  await waitFor(() => {
    expect(screen.getByTestId("differences_form")).toBeInTheDocument();
  });
  if (headingShouldHaveFocus) {
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
        }),
      ).toHaveFocus();
    });
  }
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

const expectPoliticalGroupCandidatesForm = async (pgNumber: number, headingShouldHaveFocus = true) => {
  await waitFor(() => {
    expect(screen.getByTestId(`candidates_form_${pgNumber}`)).toBeInTheDocument();
  });
  if (headingShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    });
  }
};

const fillPoliticalGroupCandidatesVotesForm = async () => {
  await userTypeInputs(user, {
    "candidate_votes[0].votes": 5,
    "candidate_votes[1].votes": 5,
    total: 10,
  });
};

const expectCheckAndSavePage = async (headingShouldHaveFocus = true) => {
  await waitFor(() => {
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/save");
  });
  if (headingShouldHaveFocus) {
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Controleren en opslaan" })).toHaveFocus();
    });
  }
};

const expectFeedbackError = async (code?: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("feedback-error")).toBeInTheDocument();
  });
  if (code) {
    expect(screen.getByText(code)).toBeInTheDocument();
  }
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
  });
};

const expectFeedbackWarning = async (code?: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("feedback-warning")).toBeInTheDocument();
  });
  if (code) {
    expect(screen.getByText(code)).toBeInTheDocument();
  }
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
  });
};

const acceptWarnings = async () => {
  await user.click(screen.getByLabelText("Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."));
  expect(
    screen.getByLabelText("Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."),
  ).toBeChecked();
};

const expectBlockerModal = async () => {
  expect(await screen.findByTestId("modal-title")).toHaveFocus();
  expect(await screen.findByTestId("modal-title")).toHaveTextContent("Let op: niet opgeslagen wijzigingen");
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
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");
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

const gotoForm = async (id: FormIdentifier, headingShouldHaveFocus = true) => {
  if (id.startsWith("candidates_")) {
    const bits = id.split("_");
    if (bits.length === 2 && bits[1]) {
      const pgNumber = parseInt(bits[1]);
      await userEvent.click(screen.getByRole("link", { name: `Lijst ${pgNumber}` }));
      await expectPoliticalGroupCandidatesForm(pgNumber, headingShouldHaveFocus);
      return;
    }
  }
  switch (id) {
    case "recounted":
      await userEvent.click(screen.getByRole("link", { name: "Is er herteld?" }));
      await expectRecountedForm(headingShouldHaveFocus);
      break;
    case "voters_and_votes":
      await userEvent.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm(headingShouldHaveFocus);
      break;
    case "differences":
      await userEvent.click(screen.getByRole("link", { name: "Verschillen" }));
      await expectDifferencesForm(headingShouldHaveFocus);
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
  describe("Navigation through the form", () => {
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
        () => expectVotersAndVotesForm(false),
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

    test("Navigate to next page after navigating back one page submitting", async () => {
      // https://github.com/kiesraad/abacus/issues/426
      render();
      await startPollingStationInput();
      await expectRecountedForm();
      await fillRecountedFormNo();
      await submit();
      await expectVotersAndVotesForm();
      await fillVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
      await userEvent.click(screen.getByRole("link", { name: "Aantal kiezers en stemmen" }));
      await expectVotersAndVotesForm();
      await submit();
      await expectDifferencesForm();
    });

    test("Navigate to next page after navigating back two pages and submitting", async () => {
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
        () => expectElementContainsIcon("list-item-save", "je bent hier"),
        () => gotoForm("recounted"),
        () => expectElementContainsIcon("list-item-save", "nog niet afgerond"),
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
        () => expectElementContainsIcon("list-item-voters-and-votes", "je bent hier"),
        () =>
          fillVotersAndVotesForm({
            poll_card_count: total_votes + 1,
            total_admitted_voters_count: total_votes + 1,
            votes_candidates_count: total_votes,
            total_votes_cast_count: total_votes,
          }),
        submit,
        () => expectDifferencesForm(false),
        () => fillDifferencesForm({ fewer_ballots_count: 1, no_explanation_count: 2 }),
        submit,
        () => expectFeedbackWarning("W.302"),
        acceptWarnings,
        submit,

        () => expectPoliticalGroupCandidatesForm(1),
        () => expectElementContainsIcon("list-item-differences", "bevat een waarschuwing"),

        () => gotoForm("voters_and_votes"),
        () =>
          userTypeInputs(user, {
            total_admitted_voters_count: 1,
          }),
        submit,
        () => expectVotersAndVotesForm(false),
        () => gotoForm("differences", false),
        () => expectElementContainsIcon("list-item-voters-and-votes", "bevat een fout"),
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
