/**
 * @vitest-environment jsdom
 */
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { getUrlMethodAndBody, overrideOnce, render, screen } from "app/test/unit";

import {
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
} from "@kiesraad/api";
import { electionMock } from "@kiesraad/api-mocks";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

const Component = (
  <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
    <VotersAndVotesForm />
  </PollingStationFormController>
);

const rootRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
  data: {
    political_group_votes: electionMock.political_groups.map((group) => ({
      number: group.number,
      total: 0,
      candidate_votes: group.candidates.map((candidate) => ({
        number: candidate.number,
        votes: 0,
      })),
    })),
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
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
  },
};

describe("Test VotersAndVotesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  describe("VotersAndVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const spy = vi.spyOn(global, "fetch");

      const user = userEvent.setup();

      render(Component);

      const pollCards = screen.getByTestId("poll_card_count");
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

      render(Component);

      const pollCards = screen.getByTestId("poll_card_count");
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

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  describe("VotersAndVotesForm API request and response", () => {
    test("VotersAndVotesForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

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

      render(Component);

      await user.type(
        screen.getByTestId("poll_card_count"),
        expectedRequest.data.voters_counts.poll_card_count.toString(),
      );
      await user.type(
        screen.getByTestId("proxy_certificate_count"),
        expectedRequest.data.voters_counts.proxy_certificate_count.toString(),
      );
      await user.type(
        screen.getByTestId("voter_card_count"),
        expectedRequest.data.voters_counts.voter_card_count.toString(),
      );
      await user.type(
        screen.getByTestId("total_admitted_voters_count"),
        expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
      );

      await user.type(
        screen.getByTestId("votes_candidates_counts"),
        expectedRequest.data.votes_counts.votes_candidates_counts.toString(),
      );
      await user.type(
        screen.getByTestId("blank_votes_count"),
        expectedRequest.data.votes_counts.blank_votes_count.toString(),
      );
      await user.type(
        screen.getByTestId("invalid_votes_count"),
        expectedRequest.data.votes_counts.invalid_votes_count.toString(),
      );
      await user.type(
        screen.getByTestId("total_votes_cast_count"),
        expectedRequest.data.votes_counts.total_votes_cast_count.toString(),
      );

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);

      expect(url).toEqual("http://testhost/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });

    test("422 response results in display of error message", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
        message: "422 error from mock",
      });

      const user = userEvent.setup();

      render(Component);

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
      const feedbackServerError = await screen.findByTestId("feedback-server-error");
      expect(feedbackServerError).toHaveTextContent(/^Error422 error from mock$/);

      expect(screen.queryByTestId("result")).not.toBeNull();
      expect(screen.queryByTestId("result")).toHaveTextContent(/^422 error from mock$/);
    });

    test("500 response results in display of error message", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
        message: "500 error from mock",
        errorCode: "500_ERROR",
      });

      const user = userEvent.setup();

      render(Component);

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
      const feedbackServerError = await screen.findByTestId("feedback-server-error");
      expect(feedbackServerError).toHaveTextContent(/^Error500 error from mock$/);

      expect(screen.queryByTestId("result")).not.toBeNull();
      expect(screen.queryByTestId("result")).toHaveTextContent(/^500 error from mock$/);
    });
  });

  describe("VotersAndVotesForm errors", () => {
    test("F.01 Invalid value", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.voters_counts.poll_card_count"],
              code: "OutOfRange",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      render(Component);

      // Since the component does not allow to input invalid values such as -3,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^OutOfRange$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.11 IncorrectTotal Voters", async () => {
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
              code: "IncorrectTotal",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      render(Component);

      await user.type(screen.getByTestId("poll_card_count"), "1");
      await user.type(screen.getByTestId("proxy_certificate_count"), "1");
      await user.type(screen.getByTestId("voter_card_count"), "1");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^IncorrectTotal$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.12 IncorrectTotal Votes", async () => {
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
              code: "IncorrectTotal",
            },
            {
              fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
              code: "IncorrectTotal",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      render(Component);

      await user.type(screen.getByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^IncorrectTotal$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
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

      render(Component);

      // Since the component does not allow to input values for non-existing fields,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(screen.queryByTestId("result")).toBeNull();
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("feedback-server-error")).toBeNull();
    });
  });

  describe("VotersAndVotesForm warnings", () => {
    test("W.21 AboveThreshold blank votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.total_votes_cast_count",
              ],
              code: "AboveThreshold",
            },
          ],
        },
      });

      const user = userEvent.setup();

      render(Component);

      await user.type(screen.getByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^AboveThreshold$/);
      expect(screen.queryByTestId("feedback-server-error")).toBeNull();
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.22 AboveThreshold invalid votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.total_votes_cast_count",
              ],
              code: "AboveThreshold",
            },
          ],
        },
      });

      const user = userEvent.setup();

      render(Component);

      await user.type(screen.getByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^AboveThreshold$/);
      expect(screen.queryByTestId("feedback-server-error")).toBeNull();
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.27 EqualInput voters and votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
              code: "IncorrectTotal",
            },
          ],
          warnings: [
            {
              fields: ["data.voters_counts", "data.votes_counts"],
              code: "EqualInput",
            },
          ],
        },
      });

      const user = userEvent.setup();

      render(Component);

      await user.type(screen.getByTestId("poll_card_count"), "1");
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
      expect(feedbackWarning).toHaveTextContent(/^EqualInput$/);
      expect(screen.queryByTestId("feedback-server-error")).toBeNull();
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });
  });
});
