import { render, screen } from "app/test/unit/test-utils";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

import { overrideOnce } from "app/test/unit";

// ToDo: overrideOnce() does not seem to be working, so first test passes and second/third
// fail, not because of the overrideOnce(), but because of the pollingStationDataEntryHandler.

describe("VotersAndVotesForm", () => {
  test("Enter form field values successfully", async () => {
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

    expect(screen.getByTestId("result")).toHaveTextContent("Success");

    // TODO: assert the call to the mocked API once that's been implemented
  });

  test("Enter form field values returns 422", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 422, {
      message: "422 error from mock",
      errorCode: "422_ERROR",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent("fake error from mock");
  });

  test("Enter form field values returns 500", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(<VotersAndVotesForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(screen.getByTestId("result")).toHaveTextContent("500 error from mock");
  });
});
