/**
 * TEST PLAN:
  Variables in form

  voters_counts: {
    A poll_card_count: number
    B proxy_certificate_count: number
    C voter_card_count: number
    D total_admitted_voters_count: number
  },
  votes_counts: {
    E votes_candidates_counts: number
    F blank_votes_count: number
    G invalid_votes_count: number
    H total_votes_cast_count: number
  },
  voters_recounts: {
    A.2 poll_card_recount: number
    B.2 proxy_certificate_recount: number
    C.2 voter_card_recount: number
    D.2 total_admitted_voters_recount: number 
  }

  Possible local errors:
  F.201 A B C D
  F.202 E F G H
  F.203 A.2 B.2 C.2 D.2

  Possible local warnings:
  W.201 F
  W.202 G
  W.203 D H
  W.204 H D.2
  W.205 H
  W.206 D H
  W.207 H D.2
  w.208 none
  W.209 E F G H A.2 B.2 C.2 D.2

  Possible global errors:
  Global errors should only be displayed when all form sections are saved and the form is completed.

  F.204 E
*/
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { getUrlMethodAndBody, overrideOnce, render, screen, userTypeInputs } from "app/test/unit";

import {
  FormState,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
  PollingStationValues,
} from "@kiesraad/api";
import { electionMockData, pollingStationMockData } from "@kiesraad/api-mocks";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

const defaultFormState: FormState = {
  active: "recounted",
  current: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 3,
      id: "save",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
  },
  unknown: {
    errors: [],
    warnings: [],
  },
  isCompleted: false,
};

function renderForm(defaultValues: Partial<PollingStationValues> = {}) {
  return render(
    <PollingStationFormController
      election={electionMockData}
      pollingStationId={pollingStationMockData.id}
      entryNumber={1}
      defaultValues={defaultValues}
      defaultFormState={defaultFormState}
    >
      <VotersAndVotesForm />
    </PollingStationFormController>,
  );
}

const rootRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
  data: {
    recounted: false,
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_counts: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    voters_recounts: undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: electionMockData.political_groups.map((group) => ({
      number: group.number,
      total: 0,
      candidate_votes: group.candidates.map((candidate) => ({
        number: candidate.number,
        votes: 0,
      })),
    })),
  },
};

describe("Test VotersAndVotesForm", () => {
  describe("VotersAndVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const pollCards = await screen.findByTestId("poll_card_count");
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12.345");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const pollCards = await screen.findByTestId("poll_card_count");
      expect(pollCards).toHaveFocus();
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12.345");

      await user.keyboard("{enter}");

      const proxyCertificates = screen.getByTestId("proxy_certificate_count");
      expect(proxyCertificates).toHaveFocus();
      await user.paste("6789");
      expect(proxyCertificates).toHaveValue("6.789");

      await user.keyboard("{enter}");

      const voterCards = screen.getByTestId("voter_card_count");
      expect(voterCards).toHaveFocus();
      await user.type(voterCards, "123");
      expect(voterCards).toHaveValue("123");

      await user.keyboard("{enter}");

      const totalAdmittedVoters = screen.getByTestId("total_admitted_voters_count");
      expect(totalAdmittedVoters).toHaveFocus();
      await user.paste("4242");
      expect(totalAdmittedVoters).toHaveValue("4.242");

      await user.keyboard("{enter}");

      const votesOnCandidates = screen.getByTestId("votes_candidates_counts");
      expect(votesOnCandidates).toHaveFocus();
      await user.type(votesOnCandidates, "12");
      expect(votesOnCandidates).toHaveValue("12");

      await user.keyboard("{enter}");

      const blankVotes = screen.getByTestId("blank_votes_count");
      expect(blankVotes).toHaveFocus();
      // Test if maxLength on field works
      await user.type(blankVotes, "1000000000");
      expect(blankVotes).toHaveValue("100.000.000");

      await user.keyboard("{enter}");

      const invalidVotes = screen.getByTestId("invalid_votes_count");
      expect(invalidVotes).toHaveFocus();
      await user.type(invalidVotes, "3");
      expect(invalidVotes).toHaveValue("3");

      await user.keyboard("{enter}");

      const totalVotesCast = screen.getByTestId("total_votes_cast_count");
      expect(totalVotesCast).toHaveFocus();
      await user.type(totalVotesCast, "555");
      expect(totalVotesCast).toHaveValue("555");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("VotersAndVotesForm API request and response", () => {
    test("VotersAndVotesForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...rootRequest.data,
          voters_counts: {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 6,
          },
          votes_counts: {
            votes_candidates_counts: 4,
            blank_votes_count: 5,
            invalid_votes_count: 6,
            total_votes_cast_count: 15,
          },
        },
      };

      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      await userTypeInputs(user, {
        ...expectedRequest.data.voters_counts,
        ...expectedRequest.data.votes_counts,
      });

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);

      expect(url).toEqual("http://testhost/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);
    });
  });

  describe("VotersAndVotesForm errors", () => {
    test("F.201 IncorrectTotal Voters counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.total_admitted_voters_count",
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
                "data.voters_counts.voter_card_count",
              ],
              code: "F201",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "1");
      await user.type(screen.getByTestId("proxy_certificate_count"), "1");
      await user.type(screen.getByTestId("voter_card_count"), "1");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F201$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.202 IncorrectTotal Votes counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.votes_counts.votes_candidates_counts",
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.invalid_votes_count",
              ],
              code: "F202",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F202$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.203 IncorrectTotal Voters recounts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_recounts.total_admitted_voters_recount",
                "data.voters_recounts.poll_card_recount",
                "data.voters_recounts.proxy_certificate_recount",
                "data.voters_recounts.voter_card_recount",
              ],
              code: "F203",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: true });

      await user.type(screen.getByTestId("poll_card_recount"), "1");
      await user.type(screen.getByTestId("proxy_certificate_recount"), "1");
      await user.type(screen.getByTestId("voter_card_recount"), "1");
      await user.type(screen.getByTestId("total_admitted_voters_recount"), "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F203$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("Error with non-existing fields is not displayed", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.not_a_real_object.not_a_real_field",
                "data.not_a_real_object.this_field_does_not_exist",
              ],
              code: "NotARealError",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // Since the component does not allow to input values for non-existing fields,
      // not inputting any values and just clicking the submit button.
      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });

  describe("VotersAndVotesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W201",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W201$/);

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        /^Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.$/,
      );
    });

    test("W.201 AboveThreshold blank votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W201",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W201$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.202 AboveThreshold invalid votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W202",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W202$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.209 EqualInput voters counts and votes counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.voters_counts", "data.votes_counts"],
              code: "W209",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "1");
      await user.type(screen.getByTestId("proxy_certificate_count"), "0");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "1");

      await user.type(screen.getByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W209$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.210 EqualInput voters recounts and votes counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.voters_recounts", "data.votes_counts"],
              code: "W210",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: true });

      await user.type(screen.getByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      await user.type(screen.getByTestId("poll_card_recount"), "1");
      await user.type(screen.getByTestId("proxy_certificate_recount"), "0");
      await user.type(screen.getByTestId("voter_card_recount"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_recount"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W210$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });
  });
});
