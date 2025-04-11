import { describe, expect, test } from "vitest";

import { electionListMockResponse } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";

import { useElectionListRequest } from "./useElectionListRequest";

describe("Test useElectionListRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections", 200, electionListMockResponse);
    const { result } = renderHook(() => useElectionListRequest(), { wrapper: Providers });

    expect(result.current.requestState.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.requestState.status).toBe("success");
    });

    expect(result.current.requestState.status === "success" && result.current.requestState.data).toEqual(
      electionListMockResponse,
    );
  });
});
