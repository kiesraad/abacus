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

    const pollCards = screen.getByTestId("pollCards");
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      200,
      {
        message: "Data saved",
        saved: true,
        validation_results: { errors: [], warnings: [] },
      },
    );

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const pollCards = screen.getByTestId("pollCards");
    expect(pollCards).toHaveFocus();
    await user.clear(pollCards);
    await user.type(pollCards, "12345");
    expect(pollCards).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const proxyCertificates = screen.getByTestId("proxyCertificates");
    expect(proxyCertificates).toHaveFocus();
    await user.clear(proxyCertificates);
    await user.paste("6789");
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
    await user.paste("4242");
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
    // Test if maxLength on field works
    await user.type(blankVotes, "1000000000");
    expect(blankVotes).toHaveValue("100.000.000");

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

      const pollCards = getByTestId("pollCards");
      fireEvent.change(pollCards, {
        target: { value: expectedRequest.data.voters_counts.poll_card_count.toString() },
      });

      const proxyCertificates = getByTestId("proxyCertificates");
      fireEvent.change(proxyCertificates, {
        target: { value: expectedRequest.data.voters_counts.proxy_certificate_count.toString() },
      });

      const voterCards = getByTestId("voterCards");
      fireEvent.change(voterCards, {
        target: { value: expectedRequest.data.voters_counts.voter_card_count.toString() },
      });

      const totalAdmittedVoters = getByTestId("totalAdmittedVoters");
      fireEvent.change(totalAdmittedVoters, {
        target: {
          value: expectedRequest.data.voters_counts.total_admitted_voters_count.toString(),
        },
      });

      const votesOnCandidates = getByTestId("votesOnCandidates");
      fireEvent.change(votesOnCandidates, {
        target: { value: expectedRequest.data.votes_counts.votes_candidates_counts.toString() },
      });

      const blankVotes = getByTestId("blankVotes");
      fireEvent.change(blankVotes, {
        target: { value: expectedRequest.data.votes_counts.blank_votes_count.toString() },
      });

      const invalidVotes = getByTestId("invalidVotes");
      fireEvent.change(invalidVotes, {
        target: { value: expectedRequest.data.votes_counts.invalid_votes_count.toString() },
      });

      const totalVotesCast = getByTestId("totalVotesCast");
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
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      422,
      {
        message: "422 error from mock",
      },
    );

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      500,
      {
        message: "500 error from mock",
        errorCode: "500_ERROR",
      },
    );

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 500_ERROR 500 error from mock$/);
  });
});
