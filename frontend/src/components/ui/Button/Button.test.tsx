import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import cls from "./Button.module.css";
import { ButtonLinks, Buttons } from "./Button.stories";

describe("Button", () => {
  test("The default button is enabled", async () => {
    render(<Buttons size="md" text="Click me" disabled={false} />);

    const buttons = await screen.findAllByRole("button", {
      name: "Click me",
    });

    for (const button of buttons) {
      expect(button).toBeEnabled();
      button.click();
      expect(button).toHaveAttribute("data-has-been-clicked");
    }
  });

  test("The disabled button is disabled", async () => {
    render(<Buttons size="md" text="Click me" disabled={true} />);

    const buttons = await screen.findAllByRole("button", {
      name: "Click me",
    });

    for (const button of buttons) {
      expect(button).toBeDisabled();
      button.click();
      expect(button).not.toHaveAttribute("data-has-been-clicked");
    }
  });
});

describe("Button.Link", () => {
  test("The default button is enabled", async () => {
    render(<ButtonLinks size="md" text="Click me" disabled={false} />);

    const buttons = await screen.findAllByRole("link", {
      name: "Click me",
    });

    for (const button of buttons) {
      expect(button).not.toHaveClass(cls.disabled!);
    }
  });

  test("The disabled button is disabled", async () => {
    render(<ButtonLinks size="md" text="Click me" disabled={true} />);

    const buttons = await screen.findAllByRole("link", {
      name: "Click me",
    });

    for (const button of buttons) {
      expect(button).toHaveClass(cls.disabled!);
    }
  });
});
