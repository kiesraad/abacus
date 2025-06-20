import { describe, expect, test } from "vitest";

import { render } from "@/testing/test-utils";

import { DefaultGrid } from "./InputGrid.stories";

describe("InputGrid", () => {
  test("InputGrid renders", () => {
    render(<DefaultGrid readOnly={false} />);
    expect(true).toBe(true);
  });
});
