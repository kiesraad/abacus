import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen } from "app/test/unit";

import { Button } from "./Button";
import { DefaultButton, DisabledButton, EnabledButton } from "./Button.stories";

describe("UI Component: Button", () => {
  test("The default button is enabled", () => {
    render(
      <DefaultButton label="Click me" variant="default" size="md" text="Click me"></DefaultButton>,
    );

    const buttonElement = screen.getByRole("button", {
      name: "Click me",
    });

    buttonElement.click();
    expect(buttonElement).toBeEnabled();
  });

  test("The enabled button is enabled", () => {
    render(<EnabledButton text="Click me!" label="enabled-button"></EnabledButton>);

    const buttonElement = screen.getByRole("button", {
      name: "enabled-button",
    });

    expect(buttonElement).toBeEnabled();
  });

  test("The disabled button is disabled", () => {
    render(
      <DisabledButton text="Try and click me!" label="disabled-button" disabled></DisabledButton>,
    );

    const buttonElement = screen.getByRole("button", {
      name: "disabled-button",
    });

    expect(buttonElement).toBeDisabled();
  });

  test("The keyboard shortcut works", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button onClick={onClick} keyboardShortcut="Shift+Enter">
        Hello world
      </Button>,
    );

    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onClick).toHaveBeenCalled();
  });
});
