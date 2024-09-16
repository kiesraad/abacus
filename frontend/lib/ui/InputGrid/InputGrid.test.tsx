import { userEvent } from "@testing-library/user-event";
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

  test("Move focus arrow up and down and tab and enter", async () => {
    render(<DefaultGrid />);

    const firstInput = screen.getByTestId("input1");
    const secondInput = screen.getByTestId("input2");
    const thirdInput = screen.getByTestId("input3");

    firstInput.focus();

    await userEvent.keyboard("{arrowdown}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{arrowup}");

    expect(firstInput).toHaveFocus();

    await userEvent.keyboard("{tab}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{enter}");

    expect(thirdInput).toHaveFocus();
  });

  test("Move to last input with shortcut", async () => {
    render(<DefaultGrid />);

    const firstInput = screen.getByTestId("input1");
    const thirdInput = screen.getByTestId("input3");

    firstInput.focus();

    await userEvent.keyboard("{Shift>}{arrowdown}{/Shift}");
    expect(thirdInput).toHaveFocus();
  });
});
