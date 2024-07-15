import { getUrlMethodAndBody, overrideOnce, render, screen } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";
import {
  Election,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PoliticalGroup,
  PollingStationFormController,
} from "@kiesraad/api";
import { electionMock, politicalGroupMock } from "@kiesraad/api-mocks";

import { CandidatesVotesForm } from "./CandidatesVotesForm";

const Component = (
  <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
    <CandidatesVotesForm group={politicalGroupMock} />
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

describe("Test CandidatesVotesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();
    render(Component);

    const candidate1 = screen.getByTestId("candidate_votes-1.votes");
    await user.clear(candidate1);
    await user.type(candidate1, "12345");
    expect(candidate1).toHaveValue("12.345");

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

    const candidate1 = screen.getByTestId("candidate_votes-1.votes");
    expect(candidate1).toHaveFocus();
    await user.clear(candidate1);
    await user.type(candidate1, "12345");
    expect(candidate1).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const candidate2 = screen.getByTestId("candidate_votes-2.votes");
    expect(candidate2).toHaveFocus();
    await user.clear(candidate2);
    await user.type(candidate2, "6789");
    expect(candidate2).toHaveValue("6.789");

    await user.keyboard("{enter}");

    const candidate3 = screen.getByTestId("candidate_votes-3.votes");
    expect(candidate3).toHaveFocus();
    await user.clear(candidate3);
    await user.type(candidate3, "123");
    expect(candidate3).toHaveValue("123");

    await user.keyboard("{enter}");

    const candidate4 = screen.getByTestId("candidate_votes-4.votes");
    expect(candidate4).toHaveFocus();
    await user.clear(candidate4);
    await user.paste("4242");
    expect(candidate4).toHaveValue("4.242");

    await user.keyboard("{enter}");

    const candidate5 = screen.getByTestId("candidate_votes-5.votes");
    expect(candidate5).toHaveFocus();
    await user.clear(candidate5);
    await user.type(candidate5, "12");
    expect(candidate5).toHaveValue("12");

    await user.keyboard("{enter}");

    const candidate6 = screen.getByTestId("candidate_votes-6.votes");
    expect(candidate6).toHaveFocus();
    await user.clear(candidate6);
    // Test if maxLength on field works
    await user.type(candidate6, "1000000000");
    expect(candidate6).toHaveValue("100.000.000");

    await user.keyboard("{enter}");

    const candidate7 = screen.getByTestId("candidate_votes-7.votes");
    expect(candidate7).toHaveFocus();
    await user.clear(candidate7);
    await user.type(candidate7, "3");
    expect(candidate7).toHaveValue("3");

    await user.keyboard("{enter}");

    const total = screen.getByTestId("total");
    await user.click(total);
    expect(total).toHaveFocus();
    await user.clear(total);
    await user.type(total, "555");
    expect(total).toHaveValue("555");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Success$/);
  });

  describe("CandidateVotesForm Api call", () => {
    test("CandidateVotesForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

      const politicalGroupMockData: PoliticalGroup = {
        number: 1,
        name: "Lijst 1 - Vurige Vleugels Partij",
        candidates: [
          {
            number: 1,
            initials: "E.",
            first_name: "Eldor",
            last_name: "Zilverlicht",
            locality: "Amsterdam",
          },
          {
            number: 2,
            initials: "G.",
            first_name: "Grom",
            last_name: "Donderbrul",
            locality: "Rotterdam",
          },
        ],
      };

      const electionMockData: Election = {
        id: 1,
        name: "Municipal Election",
        category: "Municipal",
        election_date: "2024-11-30",
        nomination_date: "2024-11-01",
        political_groups: [
          politicalGroupMockData,
          {
            number: 2,
            name: "Lijst 2 - Wijzen van Water en Wind",
            candidates: [
              {
                number: 1,
                initials: "A.",
                first_name: "Alice",
                last_name: "Foo",
                locality: "Amsterdam",
                gender: "Female",
              },
              {
                number: 2,
                initials: "C.",
                first_name: "Charlie",
                last_name: "Doe",
                locality: "Rotterdam",
              },
            ],
          },
        ],
      };

      const electionMock = electionMockData as Required<Election>;
      const politicalGroupMock = politicalGroupMockData as Required<PoliticalGroup>;

      const Component = (
        <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
          <CandidatesVotesForm group={politicalGroupMock} />
        </PollingStationFormController>
      );

      const expectedRequest = {
        data: {
          ...rootRequest.data,
          political_group_votes: [
            {
              number: 1,
              total: 10,
              candidate_votes: [
                {
                  number: 1,
                  votes: 5,
                },
                {
                  number: 2,
                  votes: 5,
                },
              ],
            },
            {
              number: 2,
              total: 0,
              candidate_votes: [
                {
                  number: 1,
                  votes: 0,
                },
                {
                  number: 2,
                  votes: 0,
                },
              ],
            },
          ],
        },
      };

      const user = userEvent.setup();

      render(Component);

      const candidateOne = screen.getByTestId("candidate_votes-1.votes");
      await user.clear(candidateOne);
      await user.type(
        candidateOne,
        expectedRequest.data.political_group_votes[0]?.candidate_votes[0]?.votes.toString() ?? "0",
      );

      const candidateTwo = screen.getByTestId("candidate_votes-2.votes");
      await user.clear(candidateTwo);
      await user.type(
        candidateTwo,
        expectedRequest.data.political_group_votes[0]?.candidate_votes[1]?.votes.toString() ?? "0",
      );

      const listTotal = screen.getByTestId("total");
      await user.clear(listTotal);
      await user.type(
        listTotal,
        expectedRequest.data.political_group_votes[0]?.total.toString() ?? "0",
      );

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

  describe("CandidatesVotesForm errors", () => {
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
  });

  test("Incorrect total is caught by validation", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      saved: true,
      message: "Data entry saved successfully",
      validation_results: {
        errors: [
          {
            fields: [
              "data.political_group_votes[1].canidates[1].votes",
              "data.political_group_votes[1].canidates[2].votes",
              "data.political_group_votes[1].total",
            ],
            code: "IncorrectTotal",
          },
        ],
        warnings: [],
      },
    });

    render(Component);
    const user = userEvent.setup();

    const candidateOne = screen.getByTestId("candidate_votes-1.votes");
    await user.clear(candidateOne);
    await user.type(candidateOne, "1");

    const candidateTwo = screen.getByTestId("candidate_votes-2.votes");
    await user.clear(candidateTwo);
    await user.type(candidateTwo, "2");

    const totalInput = screen.getByTestId("total");
    await user.clear(totalInput);
    await user.type(totalInput, "10");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-error");
    expect(result).toHaveTextContent(/^IncorrectTotal$/);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
    expect(screen.queryByTestId("server-feedback-error")).toBeNull();
  });
});

describe("CandidatesVotesForm warnings", () => {
  test("W.21 AboveThreshold candidate votes", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      saved: true,
      message: "Data entry saved successfully",
      validation_results: {
        errors: [],
        warnings: [
          {
            fields: ["data.political_group_votes[1].candidates[1].votes"],
            code: "AboveThreshold",
          },
        ],
      },
    });

    const user = userEvent.setup();

    render(Component);

    const candidateOne = screen.getByTestId("candidate_votes-1.votes");
    await user.clear(candidateOne);
    await user.type(candidateOne, "1");

    const candidateTwo = screen.getByTestId("candidate_votes-2.votes");
    await user.clear(candidateTwo);
    await user.type(candidateTwo, "2");

    const totalInput = screen.getByTestId("total");
    await user.clear(totalInput);
    await user.type(totalInput, "10");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-warning");
    expect(result).toHaveTextContent(/^AboveThreshold$/);
    expect(screen.queryByTestId("feedback-server-error")).toBeNull();
    expect(screen.queryByTestId("feedback-error")).toBeNull();
  });

  test("W.21 AboveThreshold political group total votes", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      saved: true,
      message: "Data entry saved successfully",
      validation_results: {
        errors: [],
        warnings: [
          {
            fields: ["data.political_group_votes[1].total"],
            code: "AboveThreshold",
          },
        ],
      },
    });

    const user = userEvent.setup();

    render(Component);

    const candidateOne = screen.getByTestId("candidate_votes-1.votes");
    await user.clear(candidateOne);
    await user.type(candidateOne, "1");

    const candidateTwo = screen.getByTestId("candidate_votes-2.votes");
    await user.clear(candidateTwo);
    await user.type(candidateTwo, "2");

    const totalInput = screen.getByTestId("total");
    await user.clear(totalInput);
    await user.type(totalInput, "10");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-warning");
    expect(result).toHaveTextContent(/^AboveThreshold$/);
    expect(screen.queryByTestId("feedback-server-error")).toBeNull();
    expect(screen.queryByTestId("feedback-error")).toBeNull();
  });
});
