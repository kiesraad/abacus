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
import { DataEntryStateAndActionsLoaded, SectionValues } from "../types/types";
import { DataEntryProvider } from "./DataEntryProvider";
import { VotersAndVotesForm } from "./voters_and_votes/VotersAndVotesForm";

vi.mock("../hooks/useDataEntryContext");

describe("Data Entry cache behavior", () => {
  test("VotersAndVotesForm with cache", async () => {
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);

    const cacheData: SectionValues = {
      "voters_counts.poll_card_count": "100",
      "voters_counts.proxy_certificate_count": "200",
      "voters_counts.voter_card_count": "300",
      "voters_counts.total_admitted_voters_count": "600",
      "votes_counts.votes_candidates_count": "400",
      "votes_counts.blank_votes_count": "500",
      "votes_counts.invalid_votes_count": "600",
      "votes_counts.total_votes_cast_count": "150",
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
    expect(pollCards).toHaveValue("100");

    const proxyCertificates = screen.getByRole("textbox", { name: "B Volmachtbewijzen" });
    expect(proxyCertificates).toHaveValue("200");

    const voterCards = screen.getByRole("textbox", { name: "C Kiezerspassen" });
    expect(voterCards).toHaveValue("300");

    const totalAdmittedVoters = screen.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });
    expect(totalAdmittedVoters).toHaveValue("600");

    const votesOnCandidates = screen.getByRole("textbox", { name: "E Stemmen op kandidaten" });
    expect(votesOnCandidates).toHaveValue("400");

    const blankVotes = screen.getByRole("textbox", { name: "F Blanco stemmen" });
    expect(blankVotes).toHaveValue("500");

    const invalidVotes = screen.getByRole("textbox", { name: "G Ongeldige stemmen" });
    expect(invalidVotes).toHaveValue("600");

    const totalVotesCast = screen.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });
    expect(totalVotesCast).toHaveValue("150");
  });
});
