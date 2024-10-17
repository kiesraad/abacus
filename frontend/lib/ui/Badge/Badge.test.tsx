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

test("The first entry in progress badge is visible", () => {
  render(<Badge type="first_entry_in_progress" showIcon />);

  const badgeElement = screen.getByText("1e invoer");
  const badgeElementImg = screen.getByRole("img");

  // Essentially points to the same element, but at least we test
  // the presence of an icon this way
  expect(badgeElement).toBeVisible();
  expect(badgeElementImg).toBeVisible();
});
