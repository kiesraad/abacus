import { describe, expect, test } from "vitest";
import { ApiClient } from "./ApiClient";
import { overrideOnce } from "app/test/unit";

describe("ApiClient", () => {
  test("200 response is parsed as success", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, { fizz: "buzz" });

    const client = new ApiClient("testhost");
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual({ status: "success", code: 200, data: { fizz: "buzz" } });
  });

  test("422 response is parsed as client error", async () => {
    const responseBody = { fizz: "buzz" };
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 422, responseBody);

    const client = new ApiClient("testhost");
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual({ status: "client_error", code: 422, data: responseBody });
  });

  test("500 response is parsed as server error", async () => {
    const responseBody = { fizz: "buzz" };
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 500, responseBody);

    const client = new ApiClient("testhost");
    const parsedResponse = await client.postRequest("/api/polling_stations/1/data_entries/1", {
      data: null,
    });

    expect(parsedResponse).toStrictEqual({ status: "server_error", code: 500, data: responseBody });
  });

  test("318 response throws an error", async () => {
    const responseStatus = 318;
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", responseStatus, "");

    const client = new ApiClient("testhost");

    await expect(async () => {
      await client.postRequest("/api/polling_stations/1/data_entries/1", { data: null });
    }).rejects.toThrow(`Unexpected response status: ${responseStatus}`);
  });

  test("Get request returns expected data", async () => {
    overrideOnce("get", "/v1/api/test/1", 200, { fizz: "buzz" });

    const client = new ApiClient("testhost");
    const parsedResponse = await client.getRequest("/api/test/1");

    expect(parsedResponse).toStrictEqual({ status: "success", code: 200, data: { fizz: "buzz" } });
  });

  test("Invalid server response throws an error", async () => {
    overrideOnce("get", "/v1/api/test/1", 200, "invalid json");

    const client = new ApiClient("testhost");

    await expect(async () => client.getRequest("/api/test/1")).rejects.toThrowError(
      "Server response parse error: 200",
    );
  });

  test("Unexpected status code throws an error", async () => {
    overrideOnce("get", "/v1/api/test/1", 201, { fizz: "buzz" });

    const client = new ApiClient("testhost");

    await expect(async () => client.getRequest("/api/test/1")).rejects.toThrowError(
      "Unexpected response status: 201",
    );
  });
});
