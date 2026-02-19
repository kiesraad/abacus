import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { newElectionMockData } from "@/testing/api-mocks/ElectionMockData.ts";
import { overrideOnce } from "@/testing/server.ts";
import { renderReturningRouter, screen } from "@/testing/test-utils";
import type {
  ElectionDefinitionValidateResponse,
  ElectionRole,
  NewElection,
  PollingStationRequest,
} from "@/types/generated/openapi.ts";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { PollingStationRole } from "./PollingStationRole";

const election = { name: "Naam", location: "Plek", role: "GSB" } as NewElection;

function gsbElectionValidateResponse(
  election: NewElection,
  polling_stations: PollingStationRequest[] | undefined = undefined,
  matching_election: boolean | undefined = undefined,
  number_of_voters: number = 0,
): ElectionDefinitionValidateResponse {
  return {
    role: "GSB",
    hash: {
      // NOTE: In actual data, the redacted version of the hash
      // will have empty strings at the `redacted_indexes` positions.
      // We leave them in here so we can test their absence
      chunks: [
        "asdf",
        "qwer",
        "zxcv",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "gfsd",
        "a345",
        "qwer",
        "lgmg",
        "thnr",
        "nytf",
        "sdfr",
      ],
      redacted_indexes: [2, 9],
    },
    election,
    polling_stations,
    number_of_voters,
    polling_station_definition_matches_election: matching_election,
  };
}

function csbElectionValidateResponse(election: NewElection): ElectionDefinitionValidateResponse {
  return {
    role: "CSB",
    hash: {
      // NOTE: In actual data, the redacted version of the hash
      // will have empty strings at the `redacted_indexes` positions.
      // We leave them in here so we can test their absence
      chunks: [
        "asdf",
        "qwer",
        "zxcv",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "gfsd",
        "a345",
        "qwer",
        "lgmg",
        "thnr",
        "nytf",
        "sdfr",
      ],
      redacted_indexes: [2, 9],
    },
    election,
  };
}

describe("PollingStationRole component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<PollingStationRole />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Navigates to candidate list upload page", async () => {
    const state = { election, electionRole: "GSB" as ElectionRole };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 200, gsbElectionValidateResponse(newElectionMockData));
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Rol van het stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_ROLE_TYPE",
      electionRole: "GSB",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });

  test("CSB: Navigates to candidate list upload page", async () => {
    const state = { election, electionRole: "CSB" as ElectionRole };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 200, csbElectionValidateResponse(newElectionMockData));
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Rol van het stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_ROLE_TYPE",
      electionRole: "CSB",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });
});
