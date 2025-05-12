import { describe, expect, test, vi } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import { getDefaultDataEntryStateAndActionsLoaded } from "../testing/mock-data";
import { DataEntryStateAndActionsLoaded } from "../types/types";
import { DataEntryProvider } from "./DataEntryProvider";
import { VotersAndVotesForm } from "./voters_and_votes/VotersAndVotesForm";
import { VotersAndVotesValues } from "./voters_and_votes/votersAndVotesValues";

vi.mock("../hooks/useDataEntryContext");

describe("Data Entry cache behavior", () => {
  test("VotersAndVotesForm with cache", async () => {
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);

    const cacheData: VotersAndVotesValues = {
      voters_counts: {
        poll_card_count: 100,
        proxy_certificate_count: 200,
        voter_card_count: 300,
        total_admitted_voters_count: 600,
      },
      votes_counts: {
        votes_candidates_count: 400,
        blank_votes_count: 500,
        invalid_votes_count: 600,
        total_votes_cast_count: 150,
      },
    };

    const state: DataEntryStateAndActionsLoaded = {
      ...getDefaultDataEntryStateAndActionsLoaded(),
      status: "idle",
      cache: {
        key: "voters_votes_counts",
        data: cacheData,
      },
    };
    vi.mocked(useDataEntryContext).mockReturnValue(state);

    render(
      <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
        <VotersAndVotesForm />
      </DataEntryProvider>,
    );

    const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
    expect(pollCards).toHaveValue(cacheData.voters_counts.poll_card_count.toString());

    const proxyCertificates = screen.getByRole("textbox", { name: "B Volmachtbewijzen" });
    expect(proxyCertificates).toHaveValue(cacheData.voters_counts.proxy_certificate_count.toString());

    const voterCards = screen.getByRole("textbox", { name: "C Kiezerspassen" });
    expect(voterCards).toHaveValue(cacheData.voters_counts.voter_card_count.toString());

    const totalAdmittedVoters = screen.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });
    expect(totalAdmittedVoters).toHaveValue(cacheData.voters_counts.total_admitted_voters_count.toString());

    const votesOnCandidates = screen.getByRole("textbox", { name: "E Stemmen op kandidaten" });
    expect(votesOnCandidates).toHaveValue(cacheData.votes_counts.votes_candidates_count.toString());

    const blankVotes = screen.getByRole("textbox", { name: "F Blanco stemmen" });
    expect(blankVotes).toHaveValue(cacheData.votes_counts.blank_votes_count.toString());

    const invalidVotes = screen.getByRole("textbox", { name: "G Ongeldige stemmen" });
    expect(invalidVotes).toHaveValue(cacheData.votes_counts.invalid_votes_count.toString());

    const totalVotesCast = screen.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });
    expect(totalVotesCast).toHaveValue(cacheData.votes_counts.total_votes_cast_count.toString());
  });
});
