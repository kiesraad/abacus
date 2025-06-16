import { expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { Badge } from "./Badge";

test("The definitive badge is visible", () => {
  render(<Badge type="definitive" />);

  const badgeElement = screen.getByText("Definitief");

  expect(badgeElement).toBeVisible();
});

test("The entries different badge is visible", () => {
  render(<Badge type="entries_different" />);

  const badgeElement = screen.getByText("Verschil invoer 1 en 2");

  expect(badgeElement).toBeVisible();
});

test("The first entry badge is visible", () => {
  render(<Badge type="first_entry_not_started" />);

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

test("The first entry has errors badge is visible", () => {
  render(<Badge type="first_entry_has_errors" />);

  const badgeElement = screen.getByText("1e invoer");

  expect(badgeElement).toBeVisible();
});

test("The second entry badge is visible", () => {
  render(<Badge type="second_entry_not_started" />);

  const badgeElement = screen.getByText("2e invoer");

  expect(badgeElement).toBeVisible();
});

test("The second entry in progress badge is visible", () => {
  render(<Badge type="second_entry_in_progress" showIcon />);

  const badgeElement = screen.getByText("2e invoer");
  const badgeElementImg = screen.getByRole("img");

  // Essentially points to the same element, but at least we test
  // the presence of an icon this way
  expect(badgeElement).toBeVisible();
  expect(badgeElementImg).toBeVisible();
});
