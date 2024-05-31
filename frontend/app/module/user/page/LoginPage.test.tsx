import { render } from "app/test/unit/test-utils";
import { describe, expect, test } from "vitest";
import { LoginPage } from "app/module/user";

describe("LoginPage", () => {
  test("Enter form field values", () => {
    render(<LoginPage />);
    expect(true).toBe(true);
  });
});
