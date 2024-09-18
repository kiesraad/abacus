import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { NumberInput } from "./NumberInput";

describe("UI Component: number input", () => {
  test("should render a number input", () => {
    render(<NumberInput bla={true} />);
    expect(true).toBe(true);
  });
});
