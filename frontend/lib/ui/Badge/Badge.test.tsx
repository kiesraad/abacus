import { expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { Badge } from "./Badge";

/*
test("The correction badge is visible", () => {
  render(<Badge type="correction" />);

  const badgeElement = screen.getByText("Corrigendum");

  expect(badgeElement).toBeVisible();
});
 */
test("The definitive badge is visible", () => {
  render(<Badge type="definitive" />);

  const badgeElement = screen.getByText("Definitief");

  expect(badgeElement).toBeVisible();
});
/*
test("The difference badge is visible", () => {
  render(<Badge type="difference" />);

  const badgeElement = screen.getByText("Verschil invoer 1 en 2");

  expect(badgeElement).toBeVisible();
});

test("The extra entry badge is visible", () => {
  render(<Badge type="extra_entry" />);

  const badgeElement = screen.getByText("Extra invoer");

  expect(badgeElement).toBeVisible();
});
 */
test("The first entry badge is visible", () => {
  render(<Badge type="first_entry" />);

  const badgeElement = screen.getByText("1e invoer");

  expect(badgeElement).toBeVisible();
});
/*
test("The objections badge is visible", () => {
  render(<Badge type="objections" />);

  const badgeElement = screen.getByText("Bezwaren");

  expect(badgeElement).toBeVisible();
});

test("The second entry badge is visible", () => {
  render(<Badge type="second_entry" />);

  const badgeElement = screen.getByText("2e invoer");

  expect(badgeElement).toBeVisible();
});
 */
