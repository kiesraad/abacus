import { describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

import { useElectionDataRequest } from "./useElectionDataRequest";

describe("Test useElectionDataRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    const { result } = renderHook(() => useElectionDataRequest(1), { wrapper: Providers });

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });

    expect(result.current.state.status === "success" && result.current.state.data).toEqual(electionDetailsMockResponse);
  });
});
