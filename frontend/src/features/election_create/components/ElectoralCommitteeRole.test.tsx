import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  csbElectionImportValidateMockResponse,
  gsbElectionImportValidateMockResponse,
} from "@/testing/api-mocks/ElectionMockData.ts";
import { overrideOnce } from "@/testing/server.ts";
import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { CommitteeCategory, NewElection } from "@/types/generated/openapi.ts";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { ElectoralCommitteeRole } from "./ElectoralCommitteeRole.tsx";

const election = { name: "Naam", location: "Plek", committee_category: "GSB" } as NewElection;

describe("ElectoralCommitteeRole component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<ElectoralCommitteeRole />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("GSB: Navigates to candidate list upload page", async () => {
    const state = { election, committeeCategory: "GSB" as CommitteeCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 200, gsbElectionImportValidateMockResponse(false, 2000));
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <ElectoralCommitteeRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Type stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_COMMITTEE_CATEGORY",
      committeeCategory: "GSB",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });

  test("CSB: Navigates to candidate list upload page", async () => {
    const state = { election, committeeCategory: "CSB" as CommitteeCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 200, csbElectionImportValidateMockResponse);
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <ElectoralCommitteeRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Type stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_COMMITTEE_CATEGORY",
      committeeCategory: "CSB",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });
});
