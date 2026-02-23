import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  csbElectionImportValidateMockResponse,
  gsbElectionImportValidateMockResponse,
} from "@/testing/api-mocks/ElectionMockData.ts";
import { overrideOnce } from "@/testing/server.ts";
import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { ElectionRole, NewElection } from "@/types/generated/openapi.ts";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { ElectoralCommitteeRole } from "./ElectoralCommitteeRole.tsx";

const election = { name: "Naam", location: "Plek", role: "GSB" } as NewElection;

describe("ElectoralCommittee component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<ElectoralCommitteeRole />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Navigates to candidate list upload page", async () => {
    const state = { election, electionRole: "GSB" as ElectionRole };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 200, gsbElectionImportValidateMockResponse(false, 2000));
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <ElectoralCommitteeRole />
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
    overrideOnce("post", "/api/elections/import/validate", 200, csbElectionImportValidateMockResponse);
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <ElectoralCommitteeRole />
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
