import { describe, expect, test } from "vitest";

import { committeeSessionListMockResponse } from "@/testing/api-mocks/CommitteeSessionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";

import { useCommitteeSessionListRequest } from "./useCommitteeSessionListRequest";

describe("Test useCommitteeSessionListRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections/1/committee_sessions", 200, committeeSessionListMockResponse);
    const { result } = renderHook(() => useCommitteeSessionListRequest(1), { wrapper: Providers });

    expect(result.current.requestState.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.requestState.status).toBe("success");
    });

    expect(result.current.requestState.status === "success" && result.current.requestState.data).toEqual(
      committeeSessionListMockResponse,
    );
  });
});
