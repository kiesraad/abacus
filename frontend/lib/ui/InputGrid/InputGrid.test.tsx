import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { DefaultGrid } from "./InputGrid.stories";

describe("InputGrid", () => {
  test("InputGrid renders", () => {
    render(<DefaultGrid />);
    expect(true).toBe(true);
  });

  test("Row has focused class when input has focus", () => {
    render(<DefaultGrid />);

    const firstInput = screen.getByTestId("input1");
    firstInput.focus();
    expect(firstInput.parentElement?.parentElement).toHaveClass("focused");

    const secondInput = screen.getByTestId("input2");
    secondInput.focus();
    expect(firstInput.parentElement?.parentElement).not.toHaveClass("focused");
    expect(secondInput.parentElement?.parentElement).toHaveClass("focused");
  });
});
