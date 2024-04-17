import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

describe("VotersAndVotesForm", () => {
  test("Enter form field values", async () => {
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

    // TODO: assert the call to the mocked API once that's been implemented
  });
});
