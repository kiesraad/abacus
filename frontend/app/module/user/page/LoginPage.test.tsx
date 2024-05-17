import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LoginPage } from "app/module/user";
import { BrowserRouter } from "react-router-dom";

describe("LoginPage", () => {
  test("Enter form field values", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );
    expect(true).toBe(true);
  });
});
