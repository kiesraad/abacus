import { describe, expect, test, vi } from "vitest";

import { renderReturningRouter } from "@/testing/test-utils";

import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { CheckAndSave } from "./CheckAndSave";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";

describe("CheckAndSave component", () => {
  test("Navigates to election create page when no election, electionDefinitionData, candidateDefinitionData and countingMethod", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <CheckAndSave />
      </ElectionCreateContextProvider>,
    );

    expect(router.state.location.pathname).toEqual("/elections/create");
  });
});
