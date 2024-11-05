import { describe, expect, test, vi } from "vitest";

import { overrideOnce } from "app/test/unit";

import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiError";
import { ApiResponseStatus } from "./ApiResponseStatus";

describe("ApiClient", () => {
  test("200 response is parsed as success", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, { fizz: "buzz" });

    const client = new ApiClient();
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual({
      status: ApiResponseStatus.Success,
      code: 200,
      data: { fizz: "buzz" },
    });
  });

  test("422 response is parsed as client error", async () => {
    const responseBody = { fizz: "buzz" };
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, responseBody);

    const client = new ApiClient();
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual(
      new ApiError(ApiResponseStatus.ClientError, 422, "Unexpected response status: 422"),
    );
  });

  test("500 response is parsed as server error", async () => {
    const responseBody = { error: "foo" };
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, responseBody);

    const client = new ApiClient();
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual(new ApiError(ApiResponseStatus.ServerError, 500, responseBody.error));
  });

  test("318 response returns an error", async () => {
    const responseStatus = 318;
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", responseStatus, "");

    const client = new ApiClient();

    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", { data: null });

    expect(parsedResponse).toStrictEqual(
      new ApiError(ApiResponseStatus.ServerError, responseStatus, `Unexpected response status: ${responseStatus}`),
    );
  });

  test("Get request returns expected data", async () => {
    overrideOnce("get", "/api/test/1", 200, { fizz: "buzz" });

    const client = new ApiClient();
    const parsedResponse = await client.getRequest("/api/test/1");

    expect(parsedResponse).toStrictEqual({
      status: ApiResponseStatus.Success,
      code: 200,
      data: { fizz: "buzz" },
    });
  });

  test("Invalid server response returns an error", async () => {
    overrideOnce("get", "/api/test/1", 200, "invalid");

    const client = new ApiClient();

    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});

    const parsedResponse = await client.getRequest("/api/test/1");

    expect(parsedResponse).toStrictEqual(
      new ApiError(ApiResponseStatus.ClientError, 200, "Unexpected data from server: invalid"),
    );

    expect(console.error).toHaveBeenCalledWith("Unexpected data from server:", expect.any(String));
  });
});
