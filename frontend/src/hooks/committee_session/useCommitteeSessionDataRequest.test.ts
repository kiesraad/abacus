import { describe, expect, test } from "vitest";

import { committeeSessionMockResponse } from "@/testing/api-mocks/CommitteeSessionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";

import { useCommitteeSessionDataRequest } from "./useCommitteeSessionDataRequest";

describe("Test useCommitteeSessionDataRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections/1/committee_session", 200, committeeSessionMockResponse);
    const { result } = renderHook(() => useCommitteeSessionDataRequest(1), { wrapper: Providers });

    expect(result.current.requestState.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.requestState.status).toBe("success");
    });

    expect(result.current.requestState.status === "success" && result.current.requestState.data).toEqual(
      committeeSessionMockResponse,
    );
  });
});
