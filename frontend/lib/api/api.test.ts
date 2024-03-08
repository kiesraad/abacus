import { describe, expect, it } from "vitest";

describe("Mock api works", () => {
  it("echos a value", async () => {
    const resp = await fetch("http://testhost/v1/ping", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ ping: "test" })
    });
    const result = await resp.json();
    expect(result.pong).toBe("test");
  });
});
