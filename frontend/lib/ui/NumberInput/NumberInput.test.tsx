import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { NumberInput } from "./NumberInput";

describe("UI Component: number input", () => {
  test("should render a number input", () => {
    render(<NumberInput id="test" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("should format the number", () => {
    render(<NumberInput id="test" defaultValue={1200} />);
    const input = screen.getByTestId("test");

    expect(input).toHaveValue("1.200");
  });

  test("should have caret at the right position", async () => {
    render(<NumberInput id="test" />);
    const input: HTMLInputElement = screen.getByTestId("test");

    const user = userEvent.setup();

    input.focus();

    await user.type(input, "1200");

    expect(input).toHaveValue("1.200");
    expect(input.selectionStart).toBe(5);

    await user.keyboard("{arrowleft}");
    expect(input.selectionStart).toBe(4);

    await user.keyboard("{arrowleft}");
    await user.keyboard("5");
    expect(input).toHaveValue("12.500");
    expect(input.selectionStart).toBe(4);
  });

  test("should backspace the right character", async () => {
    render(<NumberInput id="test" defaultValue={12345} />);
    const input: HTMLInputElement = screen.getByTestId("test");
    const user = userEvent.setup();

    input.focus();
    //value should be 12.345
    await user.keyboard("{arrowleft}{arrowleft}{arrowleft}");
    await user.keyboard("{backspace}");
    expect(input).toHaveValue("1.345");
  });

  test("should delete the right character", async () => {
    render(<NumberInput id="test" defaultValue={12345} />);
    const input: HTMLInputElement = screen.getByTestId("test");
    const user = userEvent.setup();

    input.focus();
    //value should be 12.345
    await user.keyboard("{arrowleft}{arrowleft}{arrowleft}");
    await user.keyboard("{delete}");
    expect(input).toHaveValue("1.245");
  });
});
