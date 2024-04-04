import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {DefaultButton, EnabledButton, DisabledButton} from "./Button.stories";


test("The default button is enabled", () => {
  render(<DefaultButton></DefaultButton>);

  const buttonElement = screen.getByRole('button', {
    name: 'Click me',
  });

  buttonElement.click();
  expect(buttonElement).not.toBeDisabled();

});

test("The enabled button is enabled", () => {
  render(<EnabledButton text="Click me!" label="default-button"></EnabledButton>);

  const buttonElement = screen.getByRole('button', {
    name: 'default-button',
  });

  expect(buttonElement).not.toBeDisabled();
});

test("The disabled button is disabled", () => {
  render(<DisabledButton text="Try and click me!" label="disabled-button" disabled ></DisabledButton>);

  const buttonElement = screen.getByRole('button', {
    name: 'disabled-button',
  });

  expect(buttonElement).toBeDisabled();
});
