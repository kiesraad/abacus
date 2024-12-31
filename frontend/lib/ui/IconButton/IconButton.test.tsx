import { describe, expect, test } from "vitest";

import { render } from "@kiesraad/test";

import { DefaultIconButton, DisabledIconButton } from "./IconButton.stories";

describe("UI component: IconButton", () => {
  test("The default icon button is enabled", () => {
    const { getByTitle } = render(<DefaultIconButton label="Click me" variant="primary" size="md" isRound={false} />);

    const buttonElement = getByTitle("Icon Button");

    buttonElement.click();
    expect(buttonElement).toBeEnabled();
  });

  test("The enabled icon button is enabled", () => {
    const { getByTitle } = render(
      <DefaultIconButton label="enabled-button" variant="tertiary" size="md" isRound={true} />,
    );

    const buttonElement = getByTitle("Icon Button");

    expect(buttonElement).toBeEnabled();
  });

  test("The disabled icon button is disabled", () => {
    const { getByTitle } = render(
      <DisabledIconButton label="disabled-button" variant="secondary" size="lg" isRound={true} />,
    );

    const buttonElement = getByTitle("Icon Button");

    expect(buttonElement).toBeDisabled();
  });
});
