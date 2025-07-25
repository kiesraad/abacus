import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { NumberInput } from "./NumberInput";

describe("UI Component: number input", () => {
  test("should render a number input", () => {
    render(<NumberInput id="test" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("should format the number", () => {
    render(<NumberInput id="test" defaultValue={1200} />);
    const formattedOverlay = screen.getByTestId("test-formatted-overlay");
    expect(formattedOverlay).toHaveTextContent("1.200");
  });

  test("should deformat the number on focus", async () => {
    render(<NumberInput id="test" defaultValue={1200} />);
    const input = screen.getByTestId("test");
    const user = userEvent.setup();
    await user.click(input);
    expect(input).toHaveFocus();
    expect(screen.queryByTestId("test-formatted-overlay")).not.toBeInTheDocument();
  });

  test("should format the number on blur", async () => {
    render(<NumberInput id="test" defaultValue={1200} />);
    const input = screen.getByTestId("test");
    const user = userEvent.setup();
    await user.click(input);
    expect(input).toHaveValue("1200");
    expect(input).toHaveFocus();
    expect(screen.queryByTestId("test-formatted-overlay")).not.toBeInTheDocument();

    await user.tab();
    expect(input).not.toHaveFocus();
    expect(input).toHaveValue("1200");
    expect(await screen.findByTestId("test-formatted-overlay")).toHaveTextContent("1.200");
  });

  test("should only accept numbers", async () => {
    render(<NumberInput id="test" />);
    const input = screen.getByTestId("test");
    const user = userEvent.setup();
    await user.type(input, "abc");
    expect(input).toHaveValue("");

    await user.type(input, "123");
    expect(input).toHaveValue("123");
  });

  test("default maximum length should be 9", async () => {
    render(<NumberInput id="test" />);
    const input = screen.getByTestId("test");
    const user = userEvent.setup();
    await user.type(input, "1234567890");
    expect(input).toHaveValue("123456789");
  });

  test("maximum length can be set", async () => {
    render(<NumberInput id="test" maxLength={4} />);
    const input = screen.getByTestId("test");
    const user = userEvent.setup();
    await user.type(input, "12345");
    expect(input).toHaveValue("1234");
  });
});
