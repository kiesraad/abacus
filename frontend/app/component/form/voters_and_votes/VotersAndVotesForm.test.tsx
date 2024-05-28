import { render, screen } from "app/test/unit/test-utils";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, assert, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { VotersAndVotesForm } from "./VotersAndVotesForm";

import { overrideOnce, getRequestBody, server, interceptBodyForHandler } from "app/test/unit";
import { pollingStationDataEntryHandler } from "@kiesraad/api-mocks";

import { usePollingStationDataEntry } from "@kiesraad/api";

// references on mocking
// https://vitest.dev/guide/mocking.html#functions
// https://runthatline.com/how-to-mock-fetch-api-with-vitest/
// https://mayashavin.com/articles/two-shades-of-mocking-vitest
// https://runthatline.com/how-to-mock-fetch-api-with-vitest/

// Mocking global.fetch doesn't work:
// mocking global.fetch with global.fetch = vi.fn().mockResolvedValue(createFetchResponse());
// the test as such passes fine, but all the ones needed MSW fail,
// because there doesn't seem to be a way to revert to the actual fetch() implementation

describe("VotersAndVotesForm api call", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("option 1 - use vite spy on fetch to check request", async () => {
    const spy = vi.spyOn(global, "fetch");

    const expectedRequest = {
      data: {
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

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, expectedRequest.data.voters_counts.poll_card_count.toString());
    await user.keyboard("{tab}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    await user.clear(proxyCertificates);
    await user.type(
      proxyCertificates,
      expectedRequest.data.voters_counts.proxy_certificate_count.toString(),
    );
    await user.keyboard("{tab}");

    const voterCards = screen.getByTestId("voterCards");
    await user.clear(voterCards);
    await user.type(voterCards, expectedRequest.data.voters_counts.voter_card_count.toString());
    await user.keyboard("{tab}");

    const totalAdmittedVoters = screen.getByTestId("totalAdmittedVoters");
    await user.clear(totalAdmittedVoters);
    await user.type(
      totalAdmittedVoters,
      expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
    );
    await user.keyboard("{tab}");

    const votesOnCandidates = screen.getByTestId("votesOnCandidates");
    await user.clear(votesOnCandidates);
    await user.type(
      votesOnCandidates,
      expectedRequest.data.votes_counts.votes_candidates_counts.toString(),
    );
    await user.keyboard("{tab}");

    const blankVotes = screen.getByTestId("blankVotes");
    await user.clear(blankVotes);
    await user.type(blankVotes, expectedRequest.data.votes_counts.blank_votes_count.toString());
    await user.keyboard("{tab}");

    const invalidVotes = screen.getByTestId("invalidVotes");
    await user.clear(invalidVotes);
    await user.type(invalidVotes, expectedRequest.data.votes_counts.invalid_votes_count.toString());
    await user.keyboard("{tab}");

    const totalVotesCast = screen.getByTestId("totalVotesCast");
    await user.clear(totalVotesCast);
    await user.type(
      totalVotesCast,
      expectedRequest.data.votes_counts.total_votes_cast_count.toString(),
    );
    await user.keyboard("{tab}");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(spy).toHaveBeenCalledWith("http://testhost/v1/api/polling_stations/1/data_entries/1", {
      method: "POST",
      body: JSON.stringify(expectedRequest),
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  test("option 2 - use custom intercept in msw to check request", async () => {
    const expectedRequest = {
      data: {
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

    interceptBodyForHandler("tmp-intercept-test", pollingStationDataEntryHandler);

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, expectedRequest.data.voters_counts.poll_card_count.toString());
    await user.keyboard("{tab}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    await user.clear(proxyCertificates);
    await user.type(
      proxyCertificates,
      expectedRequest.data.voters_counts.proxy_certificate_count.toString(),
    );
    await user.keyboard("{tab}");

    const voterCards = screen.getByTestId("voterCards");
    await user.clear(voterCards);
    await user.type(voterCards, expectedRequest.data.voters_counts.voter_card_count.toString());
    await user.keyboard("{tab}");

    const totalAdmittedVoters = screen.getByTestId("totalAdmittedVoters");
    await user.clear(totalAdmittedVoters);
    await user.type(
      totalAdmittedVoters,
      expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
    );
    await user.keyboard("{tab}");

    const votesOnCandidates = screen.getByTestId("votesOnCandidates");
    await user.clear(votesOnCandidates);
    await user.type(
      votesOnCandidates,
      expectedRequest.data.votes_counts.votes_candidates_counts.toString(),
    );
    await user.keyboard("{tab}");

    const blankVotes = screen.getByTestId("blankVotes");
    await user.clear(blankVotes);
    await user.type(blankVotes, expectedRequest.data.votes_counts.blank_votes_count.toString());
    await user.keyboard("{tab}");

    const invalidVotes = screen.getByTestId("invalidVotes");
    await user.clear(invalidVotes);
    await user.type(invalidVotes, expectedRequest.data.votes_counts.invalid_votes_count.toString());
    await user.keyboard("{tab}");

    const totalVotesCast = screen.getByTestId("totalVotesCast");
    await user.clear(totalVotesCast);
    await user.type(
      totalVotesCast,
      expectedRequest.data.votes_counts.total_votes_cast_count.toString(),
    );
    await user.keyboard("{tab}");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    // await screen.findByTestId("result", {}, { timeout: 10000 });
    // expect(screen.getByTestId("result")).toHaveTextContent(/^Success$/)

    const requestBody = getRequestBody("tmp-intercept-test");
    expect(requestBody).not.toBe(null);
    assert(requestBody !== null, "request body is not null");
    expect(objectIsEqual(requestBody, expectedRequest)).toBe(true);
    // console.log("requestBody", requestBody);
  });

  test("option 3 - use msw handler specific to the test to check request", async () => {
    const expectedRequest = {
      data: {
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

    server.use(
      http.post(
        `http://testhost/v1/api/polling_stations/:id/data_entries/:entry_number`,
        async ({ request }) => {
          const json = await request.json();

          if (JSON.stringify(json) === JSON.stringify(expectedRequest)) {
            return HttpResponse.json({ data: "ok" }, { status: 200 });
          } else {
            return HttpResponse.json(
              {
                message: "500 error from mock",
                errorCode: "500_ERROR",
              },
              { status: 500 },
            );
          }
        },
        { once: true },
      ),
    );

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, expectedRequest.data.voters_counts.poll_card_count.toString());
    await user.keyboard("{tab}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    await user.clear(proxyCertificates);
    await user.type(
      proxyCertificates,
      expectedRequest.data.voters_counts.proxy_certificate_count.toString(),
    );
    await user.keyboard("{tab}");

    const voterCards = screen.getByTestId("voterCards");
    await user.clear(voterCards);
    await user.type(voterCards, expectedRequest.data.voters_counts.voter_card_count.toString());
    await user.keyboard("{tab}");

    const totalAdmittedVoters = screen.getByTestId("totalAdmittedVoters");
    await user.clear(totalAdmittedVoters);
    await user.type(
      totalAdmittedVoters,
      expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
    );
    await user.keyboard("{tab}");

    const votesOnCandidates = screen.getByTestId("votesOnCandidates");
    await user.clear(votesOnCandidates);
    await user.type(
      votesOnCandidates,
      expectedRequest.data.votes_counts.votes_candidates_counts.toString(),
    );
    await user.keyboard("{tab}");

    const blankVotes = screen.getByTestId("blankVotes");
    await user.clear(blankVotes);
    await user.type(blankVotes, expectedRequest.data.votes_counts.blank_votes_count.toString());
    await user.keyboard("{tab}");

    const invalidVotes = screen.getByTestId("invalidVotes");
    await user.clear(invalidVotes);
    await user.type(invalidVotes, expectedRequest.data.votes_counts.invalid_votes_count.toString());
    await user.keyboard("{tab}");

    const totalVotesCast = screen.getByTestId("totalVotesCast");
    await user.clear(totalVotesCast);
    await user.type(
      totalVotesCast,
      expectedRequest.data.votes_counts.total_votes_cast_count.toString(),
    );
    await user.keyboard("{tab}");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent(/^Success$/);
  });

  // ToDo: get the spy to work, then use it to validate the request
  test("option 4 - spy on usePollingStationDataEntry", async () => {
    const spy = vi.fn(usePollingStationDataEntry);

    const expectedRequest = {
      data: {
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

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, expectedRequest.data.voters_counts.poll_card_count.toString());
    await user.keyboard("{tab}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    await user.clear(proxyCertificates);
    await user.type(
      proxyCertificates,
      expectedRequest.data.voters_counts.proxy_certificate_count.toString(),
    );
    await user.keyboard("{tab}");

    const voterCards = screen.getByTestId("voterCards");
    await user.clear(voterCards);
    await user.type(voterCards, expectedRequest.data.voters_counts.voter_card_count.toString());
    await user.keyboard("{tab}");

    const totalAdmittedVoters = screen.getByTestId("totalAdmittedVoters");
    await user.clear(totalAdmittedVoters);
    await user.type(
      totalAdmittedVoters,
      expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
    );
    await user.keyboard("{tab}");

    const votesOnCandidates = screen.getByTestId("votesOnCandidates");
    await user.clear(votesOnCandidates);
    await user.type(
      votesOnCandidates,
      expectedRequest.data.votes_counts.votes_candidates_counts.toString(),
    );
    await user.keyboard("{tab}");

    const blankVotes = screen.getByTestId("blankVotes");
    await user.clear(blankVotes);
    await user.type(blankVotes, expectedRequest.data.votes_counts.blank_votes_count.toString());
    await user.keyboard("{tab}");

    const invalidVotes = screen.getByTestId("invalidVotes");
    await user.clear(invalidVotes);
    await user.type(invalidVotes, expectedRequest.data.votes_counts.invalid_votes_count.toString());
    await user.keyboard("{tab}");

    const totalVotesCast = screen.getByTestId("totalVotesCast");
    await user.clear(totalVotesCast);
    await user.type(
      totalVotesCast,
      expectedRequest.data.votes_counts.total_votes_cast_count.toString(),
    );
    await user.keyboard("{tab}");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent(/^Success$/);

    expect(spy).toHaveBeenCalled(); // this fails, but should pass
  });
});

describe("VotersAndVotesForm processes API response", () => {
  test("200 response results in display of success message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 200, "");

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    expect(proxyCertificates).toHaveFocus();
    await user.clear(proxyCertificates);
    await user.type(proxyCertificates, "6789");
    expect(proxyCertificates).toHaveValue("6.789");

    await user.keyboard("{enter}");

    const voterCards = screen.getByTestId("voterCards");
    expect(voterCards).toHaveFocus();
    await user.clear(voterCards);
    await user.type(voterCards, "123");
    expect(voterCards).toHaveValue("123");

    await user.keyboard("{enter}");

    const totalAdmittedVoters = screen.getByTestId("totalAdmittedVoters");
    expect(totalAdmittedVoters).toHaveFocus();
    await user.clear(totalAdmittedVoters);
    await user.type(totalAdmittedVoters, "4242");
    expect(totalAdmittedVoters).toHaveValue("4.242");

    await user.keyboard("{enter}");

    const votesOnCandidates = screen.getByTestId("votesOnCandidates");
    expect(votesOnCandidates).toHaveFocus();
    await user.clear(votesOnCandidates);
    await user.type(votesOnCandidates, "12");
    expect(votesOnCandidates).toHaveValue("12");

    await user.keyboard("{enter}");

    const blankVotes = screen.getByTestId("blankVotes");
    expect(blankVotes).toHaveFocus();
    await user.clear(blankVotes);
    await user.type(blankVotes, "1000000");
    expect(blankVotes).toHaveValue("1.000.000");

    await user.keyboard("{enter}");

    const invalidVotes = screen.getByTestId("invalidVotes");
    expect(invalidVotes).toHaveFocus();
    await user.clear(invalidVotes);
    await user.type(invalidVotes, "3");
    expect(invalidVotes).toHaveValue("3");

    await user.keyboard("{enter}");

    const totalVotesCast = screen.getByTestId("totalVotesCast");
    expect(totalVotesCast).toHaveFocus();
    await user.clear(totalVotesCast);
    await user.type(totalVotesCast, "555");
    expect(totalVotesCast).toHaveValue("555");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent(/^Success$/);

    // TODO: assert the call to the mocked API once that's been implemented
  });

  test("422 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 422, {
      message: "422 error from mock",
      errorCode: "422_ERROR",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent(/^Error 422_ERROR 422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent(/^Error 500_ERROR 500 error from mock$/);
  });
});

// ToDo: move objectIsEqual function to e.g. test-utils.ts if we use the function
function objectIsEqual(a: object, b: object) {
  return JSON.stringify(a) === JSON.stringify(b);
}
