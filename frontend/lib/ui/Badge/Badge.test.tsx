import { expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { Badge } from "./Badge";

test("The definitive badge is visible", () => {
  render(<Badge type="definitive" />);

  const badgeElement = screen.getByText("Definitief");

  expect(badgeElement).toBeVisible();
});
test("The first entry badge is visible", () => {
  render(<Badge type="first_entry" />);

  const badgeElement = screen.getByText("1e invoer");

  expect(badgeElement).toBeVisible();
});
