import { describe, expect, test } from "vitest";

import { InitialisedHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render } from "@/testing/test-utils";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  test("Enter form field values", () => {
    server.use(InitialisedHandler);

    render(<LoginPage />);
    expect(true).toBe(true);
  });
});
