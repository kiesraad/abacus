import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { DefaultGrid } from "./InputGrid.stories";

describe("InputGrid", () => {
  test("InputGrid renders", () => {
    render(<DefaultGrid />);
    expect(true).toBe(true);
  });
});
