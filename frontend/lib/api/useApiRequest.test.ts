import { describe, expect, test } from "vitest";
import { renderHook } from "app/test/unit/test-utils";
import { useApiRequest } from "./useApiRequest";
import { ApiResponseClientError, ApiResponseSuccess, ApiResponseServerError } from "./api";

const responseHandler = async (response: Response) => {
  const res = response as POLLING_STATION_DATA_ENTRY_RESPONSE;
  if (res.status === 200) {
    return { status: "20x", code: 200, message: "OK" } as ApiResponseSuccess;
  } else if (res.status === 422) {
    return {
      status: "40x",
      code: 422,
      message: "Unprocessable Entity",
    } as ApiResponseClientError;
  } else if (res.status === 500) {
    const data = await res.json();
    return {
      status: "50x",
      code: 500,
      message: "Internal Server Error",
      data,
    } as ApiResponseServerError<DataEntryError>;
  }
  throw new Error(`Unexpected response status: ${res.status}`);
};

describe("useApiRequest", () => {
  test("it renders", async () => {
    const { result, waitFor } = renderHook(() =>
      useApiRequest<ApiResponseSuccess, ApiResponseClientError, ApiResponseServerError>(
        "/ping",
        responseHandler,
      ),
    );
  });
});
