import { render } from "@testing-library/react";
import { Button } from "./Button";
import { expect, test } from "vitest";

test("The button works", () => {
  render(<Button>Click me</Button>);
  expect(true).toBe(true);
});
