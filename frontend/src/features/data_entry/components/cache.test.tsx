import * as ReactRouter from "react-router";

import { describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { LoginResponse } from "@/types/generated/openapi";
import { SectionValues } from "@/types/types";

import * as useDataEntryContext from "../hooks/useDataEntryContext";
import { getDefaultDataEntryStateAndActionsLoaded } from "../testing/mock-data";
import { DataEntryStateAndActionsLoaded } from "../types/types";
import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

describe("Data Entry cache behavior", () => {
  test("VotersAndVotesForm with cache", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(testUser);
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);

    const cacheData: SectionValues = {
      "voters_counts.poll_card_count": "100",
      "voters_counts.proxy_certificate_count": "200",
      "voters_counts.total_admitted_voters_count": "600",
      "votes_counts.political_group_total_votes[0].total": "150",
      "votes_counts.political_group_total_votes[1].total": "250",
      "votes_counts.total_votes_candidates_count": "400",
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
    vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });

    render(
      <MessagesProvider>
        <DataEntryProvider election={electionMockData} pollingStation={pollingStationMockData[0]!} entryNumber={1}>
          <DataEntrySection />
        </DataEntryProvider>
      </MessagesProvider>,
    );

    const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
    expect(pollCards).toHaveValue("100");

    const proxyCertificates = screen.getByRole("textbox", { name: "B Volmachtbewijzen" });
    expect(proxyCertificates).toHaveValue("200");

    const totalAdmittedVoters = screen.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });
    expect(totalAdmittedVoters).toHaveValue("600");

    const totalVotesOnParty1 = screen.getByRole("textbox", { name: "E.1 Totaal Lijst 1 - Vurige Vleugels Partij" });
    expect(totalVotesOnParty1).toHaveValue("150");

    const totalVotesOnParty2 = screen.getByRole("textbox", { name: "E.2 Totaal Lijst 2 - Wijzen van Water en Wind" });
    expect(totalVotesOnParty2).toHaveValue("250");

    const totalVotesOnCandidates = screen.getByRole("textbox", { name: "E Totaal stemmen op kandidaten" });
    expect(totalVotesOnCandidates).toHaveValue("400");

    const blankVotes = screen.getByRole("textbox", { name: "F Blanco stemmen" });
    expect(blankVotes).toHaveValue("500");

    const invalidVotes = screen.getByRole("textbox", { name: "G Ongeldige stemmen" });
    expect(invalidVotes).toHaveValue("600");

    const totalVotesCast = screen.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });
    expect(totalVotesCast).toHaveValue("150");
  });
});
