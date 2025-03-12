import { describe, expect, test } from "vitest";

import { render } from "@/testing";
import { Fraction } from "@/types/generated/openapi";

import { DisplayFraction } from "./DisplayFraction";
import { DefaultDisplayFractions } from "./DisplayFraction.stories";

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

  test("It renders all display fractions", () => {
    const { getByTestId } = render(<DefaultDisplayFractions />);

    const fraction1 = getByTestId("fraction1");
    expect(fraction1.childElementCount).toBe(2);
    expect(fraction1.children[0]).toHaveTextContent("10.000");
    expect(fraction1.children[1]).toHaveTextContent("149/150");

    const fraction2 = getByTestId("fraction2");
    expect(fraction2.childElementCount).toBe(2);
    expect(fraction2.children[0]).toHaveTextContent("1.234");
    expect(fraction2.children[1]).toHaveTextContent("20/150");

    const fraction3 = getByTestId("fraction3");
    expect(fraction3.childElementCount).toBe(2);
    expect(fraction3.children[0]).toHaveTextContent("");
    expect(fraction3.children[1]).toHaveTextContent("34/150");

    const fraction4 = getByTestId("fraction4");
    expect(fraction4.childElementCount).toBe(1);
    expect(fraction4.children[0]).toHaveTextContent("1");

    const fraction5 = getByTestId("fraction5");
    expect(fraction5.childElementCount).toBe(1);
    expect(fraction5.children[0]).toHaveTextContent("0");
  });
});
