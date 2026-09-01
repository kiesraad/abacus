import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  electionImportValidateMockResponse,
  getNewElectionMockData,
  gsbListMockData,
  provincialElectionMockData,
} from "@/testing/api-mocks/ElectionMockData";
import { overrideOnce } from "@/testing/server";
import { renderReturningRouter, screen, waitFor } from "@/testing/test-utils";
import type { RegionKey } from "@/types/generated/openapi";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { SelectGSB } from "./SelectGSB";

const state = {
  election: getNewElectionMockData(provincialElectionMockData),
  gsbList: gsbListMockData,
  electionDefinitionData: "<election />",
  electionDefinitionHash: ["1234"],
  candidateDefinitionData: "<candidates />",
  candidateDefinitionHash: ["5678"],
};

describe("SelectGSB component", () => {
  test("Navigates to election create page when no GSB list", () => {
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state: {}, dispatch });
    const router = renderReturningRouter(<SelectGSB />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Shows the GSBs sorted alphabetically with zero padded numbers", async () => {
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });

    renderReturningRouter(
      <ElectionCreateContextProvider>
        <SelectGSB />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Selecteer het gemeentelijk stembureau" })).toBeVisible();
    expect(screen.getByRole("table")).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau"],
      ["0055", "'s Gravenveen"],
      ["5678", "Sud-Test"],
      ["0123", "Súdwest-Eemstricht"],
      ["0020", "Wegenstede"],
    ]);
  });

  test("Selecting a GSB validates and navigates to polling stations", async () => {
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    const fetchSpy = vi.spyOn(global, "fetch");
    const gsbSelected = { category: "Municipality", number: 123 } satisfies RegionKey;
    overrideOnce(
      "post",
      "/api/elections/import/validate",
      200,
      electionImportValidateMockResponse({
        election: provincialElectionMockData,
        gsbSelected,
      }),
    );

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <SelectGSB />
      </ElectionCreateContextProvider>,
    );

    await user.click(await screen.findByRole("cell", { name: "Súdwest-Eemstricht" }));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_GSB_SELECTED",
        response: electionImportValidateMockResponse({
          election: provincialElectionMockData,
          gsbSelected,
        }),
        gsbSelected,
      });
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toEqual("/elections/create/polling-stations");
  });

  test("Shows an error if validation fails", async () => {
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid district",
      fatal: false,
      reference: "EmlImportError",
    });

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <SelectGSB />
      </ElectionCreateContextProvider>,
    );

    await user.click(await screen.findByRole("cell", { name: "Wegenstede" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Gemeentelijk stembureau kan niet worden geselecteerd");
    expect(dispatch).not.toHaveBeenCalled();
    expect(router.state.location.pathname).not.toEqual("/elections/create/polling-stations");
  });
});
