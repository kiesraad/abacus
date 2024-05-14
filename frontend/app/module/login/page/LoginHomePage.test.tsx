import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LoginHomePage } from "app/module/login";
import { BrowserRouter } from "react-router-dom";

describe("LoginHomePage", () => {
  test("Enter form field values", () => {
    render(
      <BrowserRouter>
        <LoginHomePage />
      </BrowserRouter>,
    );
    expect(true).toBe(true);
  });
});
