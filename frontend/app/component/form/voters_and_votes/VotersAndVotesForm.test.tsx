/**
 * @vitest-environment jsdom
 */

import { overrideOnce, render, screen, fireEvent, getUrlMethodAndBody } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";

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

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();

    render(Component);

    const pollCards = screen.getByTestId("poll_card_count");
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      message: "Data saved",
      saved: true,
      validation_results: { errors: [], warnings: [] },
    });

    const user = userEvent.setup();

    render(Component);

    const pollCards = screen.getByTestId("poll_card_count");
    expect(pollCards).toHaveFocus();
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const proxyCertificates = screen.getByTestId("proxy_certificate_count");
    expect(proxyCertificates).toHaveFocus();
    await user.clear(proxyCertificates);
    await user.paste("6789");
    expect(proxyCertificates).toHaveValue("6.789");

    await user.keyboard("{enter}");

    const voterCards = screen.getByTestId("voter_card_count");
    expect(voterCards).toHaveFocus();
    await user.clear(voterCards);
    await user.type(voterCards, "123");
    expect(voterCards).toHaveValue("123");

    await user.keyboard("{enter}");

    const totalAdmittedVoters = screen.getByTestId("total_admitted_voters_count");
    expect(totalAdmittedVoters).toHaveFocus();
    await user.clear(totalAdmittedVoters);
    await user.paste("4242");
    expect(totalAdmittedVoters).toHaveValue("4.242");

    await user.keyboard("{enter}");

    const votesOnCandidates = screen.getByTestId("votes_candidates_counts");
    expect(votesOnCandidates).toHaveFocus();
    await user.clear(votesOnCandidates);
    await user.type(votesOnCandidates, "12");
    expect(votesOnCandidates).toHaveValue("12");

    await user.keyboard("{enter}");

    const blankVotes = screen.getByTestId("blank_votes_count");
    expect(blankVotes).toHaveFocus();
    await user.clear(blankVotes);
    // Test if maxLength on field works
    await user.type(blankVotes, "1000000000");
    expect(blankVotes).toHaveValue("100.000.000");

    await user.keyboard("{enter}");

    const invalidVotes = screen.getByTestId("invalid_votes_count");
    expect(invalidVotes).toHaveFocus();
    await user.clear(invalidVotes);
    await user.type(invalidVotes, "3");
    expect(invalidVotes).toHaveValue("3");

    await user.keyboard("{enter}");

    const totalVotesCast = screen.getByTestId("total_votes_cast_count");
    expect(totalVotesCast).toHaveFocus();
    await user.clear(totalVotesCast);
    await user.type(totalVotesCast, "555");
    expect(totalVotesCast).toHaveValue("555");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Success$/);
  });

  describe("VotersAndVotesForm Api call", () => {
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

      const { getByTestId } = render(Component);

      const pollCards = getByTestId("poll_card_count");
      fireEvent.change(pollCards, {
        target: { value: expectedRequest.data.voters_counts.poll_card_count.toString() },
      });

      const proxyCertificates = getByTestId("proxy_certificate_count");
      fireEvent.change(proxyCertificates, {
        target: { value: expectedRequest.data.voters_counts.proxy_certificate_count.toString() },
      });

      const voterCards = getByTestId("voter_card_count");
      fireEvent.change(voterCards, {
        target: { value: expectedRequest.data.voters_counts.voter_card_count.toString() },
      });

      const totalAdmittedVoters = getByTestId("total_admitted_voters_count");
      fireEvent.change(totalAdmittedVoters, {
        target: {
          value: expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
        },
      });

      const votesOnCandidates = getByTestId("votes_candidates_counts");
      fireEvent.change(votesOnCandidates, {
        target: { value: expectedRequest.data.votes_counts.votes_candidates_counts.toString() },
      });

      const blankVotes = getByTestId("blank_votes_count");
      fireEvent.change(blankVotes, {
        target: { value: expectedRequest.data.votes_counts.blank_votes_count.toString() },
      });

      const invalidVotes = getByTestId("invalid_votes_count");
      fireEvent.change(invalidVotes, {
        target: { value: expectedRequest.data.votes_counts.invalid_votes_count.toString() },
      });

      const totalVotesCast = getByTestId("total_votes_cast_count");
      fireEvent.change(totalVotesCast, {
        target: { value: expectedRequest.data.votes_counts.total_votes_cast_count.toString() },
      });

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);

      expect(url).toEqual("http://testhost/v1/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  test("422 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("feedback-server-error");
    expect(result).toHaveTextContent(/^Error422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("feedback-server-error");
    expect(result).toHaveTextContent(/^Error500 error from mock$/);
  });

  test("Incorrect total is caught by validation", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      message: "Data saved",
      saved: true,
      validation_results: {
        errors: [
          {
            fields: [
              "data.votes_counts.total_votes_cast_count",
              "data.votes_counts.blank_votes_count",
              "data.votes_counts.invalid_votes_count",
              "data.votes_counts.votes_candidates_counts",
            ],
            code: "IncorrectTotal",
          },
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

    const { getByTestId } = render(Component);

    const setValue = (id: string, value: string | number) => {
      const el = getByTestId(id);
      fireEvent.change(el, {
        target: { value: `${value}` },
      });
    };

    setValue("poll_card_count", 1);
    setValue("proxy_certificate_count", 1);
    setValue("voter_card_count", 1);
    setValue("total_admitted_voters_count", 4);

    setValue("votes_candidates_counts", 1);
    setValue("blank_votes_count", 1);
    setValue("invalid_votes_count", 1);
    setValue("total_votes_cast_count", 4);

    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-error");
    expect(result).toHaveTextContent(/^IncorrectTotalIncorrectTotal$/);
  });

  describe("VotersAndVotesForm errors", () => {
    test("F.01 Invalid value", async () => {
      overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 422, {
        error:
          "Failed to deserialize the JSON body into the target type: data.voters_counts.poll_card_count: invalid value: integer `-3`, expected u32 at line 1 column 525",
      });

      const user = userEvent.setup();

      render(Component);

      // Since the component does not allow to input invalid values such as -3,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const result = await screen.findByTestId("feedback-server-error");
      expect(result).toHaveTextContent(/^Error$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });
    test("F.11 IncorrectTotal Voters", async () => {
      overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
        saved: true,
        message: "Data entry saved successfully",
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

      const pollCards = screen.getByTestId("poll_card_count");
      await user.clear(pollCards);
      await user.type(pollCards, "1");

      const proxyCertificates = screen.getByTestId("proxy_certificate_count");
      await user.clear(proxyCertificates);
      await user.type(proxyCertificates, "1");

      const voterCards = screen.getByTestId("voter_card_count");
      await user.clear(voterCards);
      await user.type(voterCards, "1");

      const totalAdmittedVoters = screen.getByTestId("total_admitted_voters_count");
      await user.clear(totalAdmittedVoters);
      await user.type(totalAdmittedVoters, "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const result = await screen.findByTestId("feedback-error");
      expect(result).toHaveTextContent(/^IncorrectTotal$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });
  });

  test("F.12 IncorrectTotal Votes", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      saved: true,
      message: "Data entry saved successfully",
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

    const pollCards = screen.getByTestId("votes_candidates_counts");
    await user.clear(pollCards);
    await user.type(pollCards, "1");

    const proxyCertificates = screen.getByTestId("blank_votes_count");
    await user.clear(proxyCertificates);
    await user.type(proxyCertificates, "1");

    const voterCards = screen.getByTestId("invalid_votes_count");
    await user.clear(voterCards);
    await user.type(voterCards, "1");

    const totalAdmittedVoters = screen.getByTestId("total_votes_cast_count");
    await user.clear(totalAdmittedVoters);
    await user.type(totalAdmittedVoters, "4");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-error");
    expect(result).toHaveTextContent(/^IncorrectTotal$/);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
    expect(screen.queryByTestId("server-feedback-error")).toBeNull();
  });
});
