/**
 * @vitest-environment jsdom
 */

import { overrideOnce, render, screen, fireEvent } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";
import { VotersAndVotesForm } from "./VotersAndVotesForm";

describe("Test VotersAndVotesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

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

    render(<VotersAndVotesForm />);

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

      const { getByTestId } = render(<VotersAndVotesForm />);

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

      expect(spy).toHaveBeenCalledWith("http://testhost/v1/api/polling_stations/1/data_entries/1", {
        method: "POST",
        body: JSON.stringify(expectedRequest),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  test("422 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^500 error from mock$/);
  });

  test("Incorrect total is caught by validation", async () => {
    const { getByTestId } = render(<VotersAndVotesForm />);

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

    const result = await screen.findByTestId("error-codes");
    expect(result).toHaveTextContent(/^IncorrectTotal,IncorrectTotal$/);
  });
});
