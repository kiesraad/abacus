import { expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { Buttons } from "./Button.stories";

test("The default button is enabled", async () => {
  render(<Buttons size="md" text="Click me" disabled={false} />);

  const buttons = await screen.findAllByRole("button", {
    name: "Click me",
  });

  for (const button of buttons) {
    button.click();
    expect(button).toBeEnabled();
  }
});

test("The disabled button is disabled", async () => {
  render(<Buttons size="md" text="Click me" disabled={true} />);

  const buttons = await screen.findAllByRole("button", {
    name: "Click me",
  });

  for (const button of buttons) {
    expect(button).toBeDisabled();
  }
});
