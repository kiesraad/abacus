import { describe, expect, test } from "vitest";

import { pingHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";

type Response = {
  pong: string;
};

describe("Mock api works", () => {
  test("echos a value", async () => {
    server.use(pingHandler);
    const resp = await fetch("/ping", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ ping: "test" }),
    });
    const result = (await resp.json()) as unknown as Response;

    expect(result.pong).toBe("test");
  });
});
