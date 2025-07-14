import { describe, expect, test } from "vitest";

import { render } from "@/testing/test-utils";
import { Fraction } from "@/types/generated/openapi";

import { DisplayFraction } from "./DisplayFraction";

describe("DisplayFraction", () => {
  test("renders a display fraction", () => {
    const { getByTestId } = render(
      <DisplayFraction id="fraction1" fraction={{ integer: 8, numerator: 4, denominator: 12 } as Fraction} />,
    );
    const fraction1 = getByTestId("fraction1");
    expect(fraction1.childElementCount).toBe(2);
    expect(fraction1.children[0]).toHaveTextContent("8");
    expect(fraction1.children[1]).toHaveTextContent("4/12");
  });
});
