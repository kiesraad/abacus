import { describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { electionsMockResponse } from "@kiesraad/api-mocks";

import { useElectionListRequest } from "./useElectionListRequest";

describe("Test useElectionListRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections", 200, electionsMockResponse);
    const { result } = renderHook(() => useElectionListRequest(), { wrapper: Providers });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(electionsMockResponse);
  });
});
