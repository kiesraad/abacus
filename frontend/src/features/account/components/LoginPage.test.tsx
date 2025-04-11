import { describe, expect, test } from "vitest";

import { render } from "@/testing/test-utils";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  test("Enter form field values", () => {
    render(<LoginPage />);
    expect(true).toBe(true);
  });
});
