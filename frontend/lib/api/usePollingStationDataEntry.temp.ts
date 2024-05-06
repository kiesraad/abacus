import { describe, expect, test } from "vitest";
import { renderHook } from "app/test/unit/test-utils";
import { useApiRequest } from "./useApiRequest";
import { ApiResponseClientError, ApiResponseSuccess, ApiResponseServerError } from "./api";




describe("useApiRequest", () => {
  
  test("it renders", async () => {
    const { result, waitFor } = renderHook(() => useApiRequest<ApiResponseSuccess, ApiResponseClientError, ApiResponseServerError>());
    
  });
});
