import { describe, expect, test } from "vitest";

import { electionDetailsMockResponse } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";

import { useElectionDataRequest } from "./useElectionDataRequest";

describe("Test useElectionDataRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    const { result } = renderHook(() => useElectionDataRequest(1), { wrapper: Providers });

    expect(result.current.requestState.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.requestState.status).toBe("success");
    });

    expect(result.current.requestState.status === "success" && result.current.requestState.data).toEqual(
      electionDetailsMockResponse,
    );
  });
});
