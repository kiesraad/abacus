import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  csbElectionMockData,
  electionImportValidateMockResponse,
  electionMockData,
} from "@/testing/api-mocks/ElectionMockData";
import { overrideOnce } from "@/testing/server";
import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { CommitteeCategory, ElectionCategory, NewElection } from "@/types/generated/openapi";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { SelectCommitteeCategory } from "./SelectCommitteeCategory";

const election = { name: "Naam", location: "Plek", committee_category: "GSB" } as NewElection;

describe("CommitteeCategory component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<SelectCommitteeCategory />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test.each<[string, CommitteeCategory, ElectionCategory, string]>([
    ["GSB for a municipal election", "GSB", "Municipal", "/elections/create/list-of-candidates"],
    ["GSB for a provincial election", "GSB", "Provincial", "/elections/create/select-gsb"],
    ["GSB for a water authority election", "GSB", "WaterAuthority", "/elections/create/select-gsb"],
  ])("%s", async (_, committeeCategory, electionCategory, expected) => {
    const state = { election: { ...election, category: electionCategory }, committeeCategory: committeeCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce(
      "post",
      "/api/elections/import/validate",
      200,
      electionImportValidateMockResponse({
        election: committeeCategory === "CSB" ? csbElectionMockData : electionMockData,
      }),
    );
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <SelectCommitteeCategory />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Type stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).toBeChecked();
    const optionCsb = screen.getByRole("radio", { name: "Centraal stembureau (CSB)" });
    expect(optionCsb).not.toBeChecked();
    if (electionCategory === "Provincial") {
      expect(optionCsb).toBeDisabled();
    } else {
      expect(optionCsb).not.toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_COMMITTEE_CATEGORY",
      committeeCategory: "GSB",
    });

    expect(router.state.location.pathname).toEqual(expected);
  });

  test("CSB: Navigates to candidate list upload page", async () => {
    const state = { election, committeeCategory: "CSB" as CommitteeCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce(
      "post",
      "/api/elections/import/validate",
      200,
      electionImportValidateMockResponse({ election: csbElectionMockData }),
    );
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <SelectCommitteeCategory />
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
