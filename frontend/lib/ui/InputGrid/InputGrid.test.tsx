import { describe, expect, test } from "vitest";

import { render } from "@kiesraad/test";

import { DefaultGrid } from "./InputGrid.stories";

describe("InputGrid", () => {
  test("InputGrid renders", () => {
    render(<DefaultGrid />);
    expect(true).toBe(true);
  });
});
