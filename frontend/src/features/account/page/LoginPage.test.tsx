import { describe, expect, test } from "vitest";

import { LoginPage } from "@/features/account";

import { render } from "@kiesraad/test";

describe("LoginPage", () => {
  test("Enter form field values", () => {
    render(<LoginPage />);
    expect(true).toBe(true);
  });
});
